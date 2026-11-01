/**
 * FILE: scripts/createVectorIndex.ts
 * PURPOSE: Setup script — create the Atlas Vector Search index on the "chunks" collection.
 *
 * Run:  npm run create:index
 *
 * The index tells Atlas:
 *   - "embedding" is a vector of N numbers (768 for Gemini, 1536 for OpenAI),
 *     compare vectors with cosine similarity
 *   - "documentId" can be used as a FILTER (needed for document permissions)
 *
 * If you SWITCH AI provider, the vector size changes. Vectors of different
 * sizes can't be compared, so this script then:
 *   1. deletes the old index,
 *   2. deletes the old chunks and marks their documents "failed" (re-upload them),
 *   3. creates a new index with the correct size.
 *
 * The index takes ~1 minute to become "READY" in Atlas. You can watch it in:
 *   Atlas -> your cluster -> Search & Vector Search tab
 */
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { connectDatabase, disconnectDatabase } from "../config/db.js";
import { Chunk } from "../models/Chunk.js";
import { DocumentModel } from "../models/Document.js";

/** Shape of the index info Atlas returns (only the parts we read). */
interface SearchIndexInfo {
  status?: string;
  latestDefinition?: { fields?: Array<{ type: string; numDimensions?: number }> };
}

/** Waits until Atlas has fully removed the old index (max ~2 minutes). */
async function waitUntilIndexIsDeleted(collection: mongoose.mongo.Collection) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const remaining = await collection.listSearchIndexes(env.VECTOR_INDEX_NAME).toArray();
    if (remaining.length === 0) return;
    await new Promise((resolve) => setTimeout(resolve, 2000)); // wait 2 seconds
  }
  throw new Error("Old index is still being deleted. Wait a minute and run the command again.");
}

async function createVectorIndex() {
  await connectDatabase();

  // Make sure the collection exists (search indexes need an existing collection)
  await Chunk.createCollection().catch(() => undefined);
  const collection = mongoose.connection.db!.collection("chunks");

  const existing = (await collection.listSearchIndexes(env.VECTOR_INDEX_NAME).toArray()) as SearchIndexInfo[];

  if (existing.length > 0) {
    const vectorField = existing[0].latestDefinition?.fields?.find((field) => field.type === "vector");
    const currentDimensions = vectorField?.numDimensions;

    // Same size -> nothing to do
    if (currentDimensions === env.embeddingDimensions) {
      console.log(
        `ℹ️  Index "${env.VECTOR_INDEX_NAME}" already exists with ${currentDimensions} dimensions (status: ${String(existing[0].status)}).`,
      );
      await disconnectDatabase();
      return;
    }

    // Different size -> provider/model changed: rebuild everything
    console.log(
      `🔁 Index has ${currentDimensions} dimensions but ${env.AI_PROVIDER} uses ${env.embeddingDimensions}. Rebuilding...`,
    );

    const { deletedCount } = await Chunk.deleteMany({});
    const { modifiedCount } = await DocumentModel.updateMany(
      { status: "ready" },
      { status: "failed", chunkCount: 0, errorMessage: "AI provider changed — please delete and re-upload this document" },
    );
    console.log(`   Removed ${deletedCount} old chunks; ${modifiedCount} document(s) need to be re-uploaded.`);

    await collection.dropSearchIndex(env.VECTOR_INDEX_NAME);
    console.log("   Old index deleted, waiting for Atlas to finish removing it...");
    await waitUntilIndexIsDeleted(collection);
  }

  await collection.createSearchIndex({
    name: env.VECTOR_INDEX_NAME,
    type: "vectorSearch",
    definition: {
      fields: [
        { type: "vector", path: "embedding", numDimensions: env.embeddingDimensions, similarity: "cosine" },
        { type: "filter", path: "documentId" },
      ],
    },
  });

  console.log(
    `✅ Vector index "${env.VECTOR_INDEX_NAME}" created (${env.embeddingDimensions} dimensions for ${env.AI_PROVIDER}). It will be READY in about 1 minute.`,
  );
  await disconnectDatabase();
}

createVectorIndex().catch(async (error) => {
  console.error("❌ Could not create the vector index:", error.message);
  console.error("👉 Make sure you use a MongoDB ATLAS cluster (M0 free tier works).");
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
