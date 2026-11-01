/**
 * FILE: models/QueryLog.ts
 * PURPOSE: One row per question asked — used for MONITORING ("querylogs" collection).
 *
 * This is how we measure the three things the project asks for:
 *   1. Response time   -> retrievalTimeMs, llmTimeMs, totalTimeMs
 *   2. Token cost      -> inputTokens, outputTokens, embeddingTokens, costUsd
 *   3. Retrieval quality -> topScore / avgScore (similarity) + user feedback 👍/👎
 *      (offline accuracy is measured by the /api/metrics/evaluate endpoint)
 */
import { Schema, model, type InferSchemaType } from "mongoose";

const queryLogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    chat: { type: Schema.Types.ObjectId, ref: "Chat", required: true },
    messageId: { type: Schema.Types.ObjectId, required: true, index: true }, // assistant message
    question: { type: String, required: true },
    model: { type: String, required: true },

    // ---- Speed ----
    retrievalTimeMs: { type: Number, required: true },
    llmTimeMs: { type: Number, required: true },
    totalTimeMs: { type: Number, required: true },

    // ---- Retrieval quality ----
    chunksRetrieved: { type: Number, required: true },
    topScore: { type: Number, default: 0 },
    avgScore: { type: Number, default: 0 },
    citationsUsed: { type: Number, default: 0 },

    // ---- Cost ----
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    embeddingTokens: { type: Number, default: 0 },
    costUsd: { type: Number, default: 0 },

    // ---- Human feedback ----
    feedback: { type: String, enum: ["up", "down", null], default: null },
  },
  { timestamps: true },
);

export type QueryLogFields = InferSchemaType<typeof queryLogSchema>;

export const QueryLog = model("QueryLog", queryLogSchema);
