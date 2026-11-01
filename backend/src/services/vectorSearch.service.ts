/**
 * FILE: services/vectorSearch.service.ts
 * PURPOSE: Find the chunks most similar to a question using MongoDB Atlas Vector Search.
 *
 * It runs an aggregation pipeline with the special `$vectorSearch` stage:
 *   - queryVector   : the question's embedding
 *   - filter        : ONLY chunks from documents this user is allowed to see
 *                     (this is how document permissions are enforced in search)
 *   - numCandidates : how many candidates Atlas looks at (more = more accurate, slower)
 *   - limit         : how many final results we want (top K)
 *
 * The index used here is created by: npm run create:index
 */
import { Types } from "mongoose";
import { Chunk } from "../models/Chunk.js";
import { env } from "../config/env.js";

/** One search hit returned to the RAG service. */
export interface SearchResult {
  chunkId: string;
  documentId: string;
  fileName: string;
  pageNumber: number | null;
  chunkIndex: number;
  text: string;
  score: number; // cosine similarity normalised by Atlas to 0..1 (1 = identical)
}

export async function searchSimilarChunks(
  queryVector: number[],
  allowedDocumentIds: Types.ObjectId[],
  topK: number = env.TOP_K,
): Promise<SearchResult[]> {
  // No accessible documents -> nothing to search
  if (allowedDocumentIds.length === 0) return [];

  const results = await Chunk.aggregate([
    {
      $vectorSearch: {
        index: env.VECTOR_INDEX_NAME,
        path: "embedding",
        queryVector,
        numCandidates: topK * 20,
        limit: topK,
        filter: { documentId: { $in: allowedDocumentIds } },
      },
    },
    {
      // Pick only the fields we need (never send the big embedding array back)
      $project: {
        _id: 1,
        documentId: 1,
        fileName: 1,
        pageNumber: 1,
        chunkIndex: 1,
        text: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);

  return results.map((r) => ({
    chunkId: String(r._id),
    documentId: String(r.documentId),
    fileName: r.fileName,
    pageNumber: r.pageNumber ?? null,
    chunkIndex: r.chunkIndex,
    text: r.text,
    score: r.score,
  }));
}
