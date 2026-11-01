/**
 * FILE: services/document.service.ts
 * PURPOSE: Everything about documents — upload pipeline, permissions, sharing, delete.
 *
 * UPLOAD PIPELINE (the "ingestion" half of RAG):
 *   file -> extract text -> split into chunks -> create embeddings -> save in MongoDB
 *
 * The upload request returns IMMEDIATELY with status "processing", and the
 * pipeline runs in the background. The frontend polls the list until the
 * status becomes "ready" (or "failed"). This keeps big files from timing out
 * the HTTP request.
 */
import { Types } from "mongoose";
import { DocumentModel, type DocumentDoc } from "../models/Document.js";
import { Chunk } from "../models/Chunk.js";
import { User } from "../models/User.js";
import type { AuthUser } from "../types/express.js";
import { extractTextFromFile } from "./textExtractor.service.js";
import { splitPagesIntoChunks } from "./chunking.service.js";
import { embedTexts } from "./embedding.service.js";
import { embeddingCost } from "../utils/cost.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

const INSERT_BATCH_SIZE = 200; // save chunks to MongoDB in groups

// ---------------------------------------------------------------------------
// Permission helpers
// ---------------------------------------------------------------------------

/**
 * MongoDB filter for "documents this user may READ / ask questions about".
 * Admin sees everything; others see own + shared-with-me + public documents.
 */
function readableDocumentsFilter(user: AuthUser) {
  if (user.role === "admin") return {};
  const userId = new Types.ObjectId(user.id);
  return { $or: [{ owner: userId }, { sharedWith: userId }, { isPublic: true }] };
}

/** True if the user may change/delete the document (owner or admin). */
function canManage(user: AuthUser, document: DocumentDoc): boolean {
  return user.role === "admin" || String(document.owner) === user.id;
}

/** Loads a document and checks that the user may manage it. */
async function getManageableDocument(user: AuthUser, documentId: string): Promise<DocumentDoc> {
  const document = await DocumentModel.findById(documentId);
  if (!document) throw new AppError("Document not found", 404);
  if (!canManage(user, document)) throw new AppError("You do not have permission to modify this document", 403);
  return document;
}

/**
 * Returns the ids of READY documents the user can query.
 * If `requestedIds` is given (user picked specific docs in the chat), the
 * result is limited to those — but still only the ones they are allowed to see.
 */
export async function getQueryableDocumentIds(user: AuthUser, requestedIds?: string[]) {
  const filter: Record<string, unknown> = { ...readableDocumentsFilter(user), status: "ready" };
  if (requestedIds && requestedIds.length > 0) {
    filter._id = { $in: requestedIds.map((id) => new Types.ObjectId(id)) };
  }
  const docs = await DocumentModel.find(filter).select("_id");
  return docs.map((doc) => doc._id);
}

// ---------------------------------------------------------------------------
// Upload + background processing
// ---------------------------------------------------------------------------

/** Step 1 (synchronous): create the document record and start processing. */
export async function uploadDocument(user: AuthUser, file: Express.Multer.File) {
  const document = await DocumentModel.create({
    owner: user.id,
    originalName: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    status: "processing",
  });

  // Start the pipeline WITHOUT awaiting it. Errors are caught inside.
  void processDocument(document.id, file.buffer, file.originalname);

  return document;
}

/** Step 2 (background): extract -> chunk -> embed -> store. */
async function processDocument(documentId: string, buffer: Buffer, fileName: string): Promise<void> {
  const startedAt = performance.now();
  try {
    // 1. Extract text page by page
    const pages = await extractTextFromFile(buffer, fileName);

    // 2. Split into overlapping chunks
    const chunks = await splitPagesIntoChunks(pages);

    // 3. Create one embedding per chunk
    const { vectors, tokens } = await embedTexts(chunks.map((c) => c.text));

    // 4. Save chunks + vectors to MongoDB (in batches)
    const document = await DocumentModel.findById(documentId);
    if (!document) return; // deleted while processing

    const chunkDocs = chunks.map((chunk, i) => ({
      documentId: document._id,
      ownerId: document.owner,
      text: chunk.text,
      embedding: vectors[i],
      fileName,
      pageNumber: chunk.pageNumber,
      chunkIndex: chunk.chunkIndex,
    }));

    for (let i = 0; i < chunkDocs.length; i += INSERT_BATCH_SIZE) {
      await Chunk.insertMany(chunkDocs.slice(i, i + INSERT_BATCH_SIZE));
    }

    // 5. Mark as ready and store stats
    document.status = "ready";
    document.pageCount = pages.length;
    document.chunkCount = chunks.length;
    document.embeddingTokens = tokens;
    document.embeddingCostUsd = embeddingCost(tokens);
    await document.save();

    const seconds = ((performance.now() - startedAt) / 1000).toFixed(1);
    logger.info(`📄 Processed "${fileName}": ${chunks.length} chunks in ${seconds}s`);
  } catch (error) {
    logger.error(`Failed to process "${fileName}"`, error);
    // Clean up partial data and record the reason so the UI can show it
    await Chunk.deleteMany({ documentId });
    await DocumentModel.findByIdAndUpdate(documentId, {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Processing failed",
    });
  }
}

// ---------------------------------------------------------------------------
// Read / share / delete
// ---------------------------------------------------------------------------

/** Lists all documents the user can see, newest first. */
export async function listDocuments(user: AuthUser) {
  const documents = await DocumentModel.find(readableDocumentsFilter(user))
    .sort({ createdAt: -1 })
    .populate("owner", "name email")
    .populate("sharedWith", "name email");

  return documents.map((doc) => ({
    ...doc.toObject(),
    canManage: canManage(user, doc),
  }));
}

/** Updates sharing settings: list of emails + public flag. Owner/admin only. */
export async function updateSharing(user: AuthUser, documentId: string, emails: string[], isPublic: boolean) {
  const document = await getManageableDocument(user, documentId);

  // Convert emails into user ids (ignore the owner's own email)
  const users = await User.find({ email: { $in: emails } }).select("_id email");
  const foundEmails = users.map((u) => u.email);
  const notFound = emails.filter((email) => !foundEmails.includes(email));
  if (notFound.length > 0) {
    throw new AppError(`No user found for: ${notFound.join(", ")}`, 404);
  }

  document.sharedWith = users.map((u) => u._id).filter((id) => !id.equals(document.owner));
  document.isPublic = isPublic;
  await document.save();

  return document.populate("sharedWith", "name email");
}

/** Deletes the document AND all its chunks. Owner/admin only. */
export async function deleteDocument(user: AuthUser, documentId: string) {
  const document = await getManageableDocument(user, documentId);
  await Chunk.deleteMany({ documentId: document._id });
  await document.deleteOne();
}
