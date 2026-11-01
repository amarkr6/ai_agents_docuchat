/**
 * FILE: services/metrics.service.ts
 * PURPOSE: Measure the quality, speed and cost of the RAG system.
 *
 *  1. getSummary()        -> dashboard numbers (avg response time, total cost, 👍 rate…)
 *  2. setFeedback()       -> user rates an answer 👍 / 👎 (online quality signal)
 *  3. evaluateRetrieval() -> OFFLINE accuracy test with known question/answer pairs:
 *       Hit Rate@K : % of questions where the correct document is in the top K results
 *       MRR        : Mean Reciprocal Rank — rewards finding it at rank 1 more than rank 5
 *
 * Normal users see their own metrics; admins see metrics for everyone.
 */
import { Types } from "mongoose";
import { QueryLog } from "../models/QueryLog.js";
import { DocumentModel } from "../models/Document.js";
import type { AuthUser } from "../types/express.js";
import { getQueryableDocumentIds } from "./document.service.js";
import { embedQuery } from "./embedding.service.js";
import { searchSimilarChunks } from "./vectorSearch.service.js";
import { AppError } from "../utils/AppError.js";

/** Admin -> no filter (all users). Others -> only their own rows. */
function scopeFilter(user: AuthUser, field: "user" | "owner") {
  return user.role === "admin" ? {} : { [field]: new Types.ObjectId(user.id) };
}

// ---------------------------------------------------------------------------
// 1. Dashboard summary
// ---------------------------------------------------------------------------
export async function getSummary(user: AuthUser) {
  // One aggregation computes all totals and averages in the database
  const [queryStats] = await QueryLog.aggregate([
    { $match: scopeFilter(user, "user") },
    {
      $group: {
        _id: null,
        totalQuestions: { $sum: 1 },
        avgTotalTimeMs: { $avg: "$totalTimeMs" },
        avgRetrievalTimeMs: { $avg: "$retrievalTimeMs" },
        avgLlmTimeMs: { $avg: "$llmTimeMs" },
        maxTotalTimeMs: { $max: "$totalTimeMs" },
        avgTopScore: { $avg: "$topScore" },
        avgCitationsUsed: { $avg: "$citationsUsed" },
        totalInputTokens: { $sum: "$inputTokens" },
        totalOutputTokens: { $sum: "$outputTokens" },
        totalQueryCostUsd: { $sum: "$costUsd" },
        thumbsUp: { $sum: { $cond: [{ $eq: ["$feedback", "up"] }, 1, 0] } },
        thumbsDown: { $sum: { $cond: [{ $eq: ["$feedback", "down"] }, 1, 0] } },
      },
    },
  ]);

  const [documentStats] = await DocumentModel.aggregate([
    { $match: scopeFilter(user, "owner") },
    {
      $group: {
        _id: null,
        totalDocuments: { $sum: 1 },
        totalChunks: { $sum: "$chunkCount" },
        totalEmbeddingCostUsd: { $sum: "$embeddingCostUsd" },
      },
    },
  ]);

  const recentQueries = await QueryLog.find(scopeFilter(user, "user"))
    .sort({ createdAt: -1 })
    .limit(20)
    .select("question totalTimeMs retrievalTimeMs llmTimeMs topScore inputTokens outputTokens costUsd feedback createdAt");

  const rated = (queryStats?.thumbsUp ?? 0) + (queryStats?.thumbsDown ?? 0);

  return {
    scope: user.role === "admin" ? "all users" : "my usage",
    questions: {
      total: queryStats?.totalQuestions ?? 0,
      avgTotalTimeMs: Math.round(queryStats?.avgTotalTimeMs ?? 0),
      avgRetrievalTimeMs: Math.round(queryStats?.avgRetrievalTimeMs ?? 0),
      avgLlmTimeMs: Math.round(queryStats?.avgLlmTimeMs ?? 0),
      maxTotalTimeMs: queryStats?.maxTotalTimeMs ?? 0,
    },
    quality: {
      avgTopScore: queryStats?.avgTopScore ?? 0,
      avgCitationsUsed: queryStats?.avgCitationsUsed ?? 0,
      thumbsUp: queryStats?.thumbsUp ?? 0,
      thumbsDown: queryStats?.thumbsDown ?? 0,
      satisfactionRate: rated > 0 ? (queryStats.thumbsUp / rated) * 100 : null,
    },
    cost: {
      totalInputTokens: queryStats?.totalInputTokens ?? 0,
      totalOutputTokens: queryStats?.totalOutputTokens ?? 0,
      queryCostUsd: queryStats?.totalQueryCostUsd ?? 0,
      embeddingCostUsd: documentStats?.totalEmbeddingCostUsd ?? 0,
      totalCostUsd: (queryStats?.totalQueryCostUsd ?? 0) + (documentStats?.totalEmbeddingCostUsd ?? 0),
    },
    documents: {
      total: documentStats?.totalDocuments ?? 0,
      totalChunks: documentStats?.totalChunks ?? 0,
    },
    recentQueries,
  };
}

// ---------------------------------------------------------------------------
// 2. Feedback 👍 / 👎
// ---------------------------------------------------------------------------
export async function setFeedback(user: AuthUser, messageId: string, feedback: "up" | "down" | null) {
  const log = await QueryLog.findOneAndUpdate(
    { messageId, user: user.id },
    { feedback },
    { returnDocument: "after" },
  );
  if (!log) throw new AppError("Answer not found", 404);
  return { messageId, feedback: log.feedback };
}

// ---------------------------------------------------------------------------
// 3. Offline retrieval evaluation
// ---------------------------------------------------------------------------
interface EvalCase {
  question: string;
  expectedDocumentId: string; // the document that SHOULD contain the answer
  expectedPage?: number; // optional: stricter check on the page too
}

export async function evaluateRetrieval(user: AuthUser, cases: EvalCase[], topK: number) {
  const allowedIds = await getQueryableDocumentIds(user);
  const results = [];

  for (const testCase of cases) {
    const start = performance.now();
    const { vector } = await embedQuery(testCase.question);
    const hits = await searchSimilarChunks(vector, allowedIds, topK);
    const timeMs = Math.round(performance.now() - start);

    // Rank (1-based) of the first hit that matches the expected document/page
    const index = hits.findIndex(
      (hit) =>
        hit.documentId === testCase.expectedDocumentId &&
        (testCase.expectedPage === undefined || hit.pageNumber === testCase.expectedPage),
    );
    const rank = index === -1 ? null : index + 1;

    results.push({
      question: testCase.question,
      found: rank !== null,
      rank,
      reciprocalRank: rank ? 1 / rank : 0,
      topScore: hits[0]?.score ?? 0,
      retrievalTimeMs: timeMs,
    });
  }

  const count = results.length;
  return {
    topK,
    totalCases: count,
    hitRate: (results.filter((r) => r.found).length / count) * 100, // percent
    mrr: results.reduce((sum, r) => sum + r.reciprocalRank, 0) / count,
    avgRetrievalTimeMs: Math.round(results.reduce((sum, r) => sum + r.retrievalTimeMs, 0) / count),
    results,
  };
}
