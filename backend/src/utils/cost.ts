/**
 * FILE: utils/cost.ts
 * PURPOSE: Helpers to estimate token counts and convert tokens into USD cost.
 *
 * AI providers charge per token. Prices (USD per 1 million tokens) come from
 * the provider defaults in config/env.ts, or from .env if you override them.
 * Gemini free tier = $0, so costs show as 0 while you use it.
 */
import { env } from "../config/env.js";

/**
 * Rough token estimate: ~4 characters ≈ 1 token for English text.
 * Used for embeddings, because the LangChain embeddings class does not return
 * exact usage numbers. (Chat completions DO return exact numbers.)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Cost (USD) of creating embeddings for the given number of tokens. */
export function embeddingCost(tokens: number): number {
  return (tokens / 1_000_000) * env.priceEmbeddingPer1M;
}

/** Cost (USD) of one chat completion = input price + output price. */
export function chatCost(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * env.priceChatInputPer1M +
    (outputTokens / 1_000_000) * env.priceChatOutputPer1M
  );
}
