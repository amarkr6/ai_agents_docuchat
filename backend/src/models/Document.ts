/**
 * FILE: models/Document.ts
 * PURPOSE: Metadata about each uploaded file ("documents" collection).
 *
 * The actual text lives in the "chunks" collection (see Chunk.ts).
 * This model also stores the PERMISSIONS of the document:
 *   - owner      : the user who uploaded it (full control)
 *   - sharedWith : list of users who may ask questions about it
 *   - isPublic   : if true, every logged-in user may ask questions about it
 */
import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from "mongoose";

// Life-cycle of an upload: processing -> ready (or failed)
export const DOCUMENT_STATUSES = ["processing", "ready", "failed"] as const;

const documentSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },

    status: { type: String, enum: DOCUMENT_STATUSES, default: "processing" },
    errorMessage: { type: String, default: null },

    pageCount: { type: Number, default: 0 },
    chunkCount: { type: Number, default: 0 },

    // Cost of creating the embeddings for this document (for cost tracking)
    embeddingTokens: { type: Number, default: 0 },
    embeddingCostUsd: { type: Number, default: 0 },

    // ---- Permissions ----
    isPublic: { type: Boolean, default: false },
    sharedWith: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

// Speeds up the "which documents can this user see?" query
documentSchema.index({ sharedWith: 1 });
documentSchema.index({ isPublic: 1 });

export type DocumentFields = InferSchemaType<typeof documentSchema>;
export type DocumentDoc = HydratedDocument<DocumentFields>;
export type DocumentId = Types.ObjectId;

export const DocumentModel = model("Document", documentSchema);
