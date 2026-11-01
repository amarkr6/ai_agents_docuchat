/**
 * FILE: models/Chunk.ts
 * PURPOSE: One small piece of a document + its embedding vector ("chunks" collection).
 *
 * RAG basics:
 *   A 50-page PDF is too big to send to the AI. So we split it into ~1000
 *   character "chunks", turn every chunk into an EMBEDDING (an array of 768 or 1536
 *   numbers that represents its meaning) and save it here.
 *
 *   When a user asks a question, MongoDB Atlas Vector Search compares the
 *   question's embedding with the "embedding" field below and returns the most
 *   similar chunks. The Atlas index is created by src/scripts/createVectorIndex.ts.
 */
import { Schema, model, type InferSchemaType } from "mongoose";

const chunkSchema = new Schema(
  {
    documentId: { type: Schema.Types.ObjectId, ref: "Document", required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    text: { type: String, required: true },
    // The vector. Atlas Vector Search indexes this field.
    embedding: { type: [Number], required: true },

    // Citation info so the answer can say "Policy.pdf, page 3"
    fileName: { type: String, required: true },
    pageNumber: { type: Number, default: null }, // null for files without pages (.txt)
    chunkIndex: { type: Number, required: true }, // position of the chunk in the document
  },
  { timestamps: true },
);

export type ChunkFields = InferSchemaType<typeof chunkSchema>;

export const Chunk = model("Chunk", chunkSchema);
