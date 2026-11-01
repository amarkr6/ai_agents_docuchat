/**
 * FILE: services/embedding.service.ts
 * PURPOSE: Turn text into embedding vectors (Gemini or OpenAI, via LangChain).
 *
 * An embedding is a list of numbers (768 for Gemini, 1536 for OpenAI) that
 * represents the MEANING of the text. Texts with similar meaning get vectors
 * that are close to each other — that's what makes semantic search work.
 *
 * Both functions also return a token estimate so we can track the cost.
 */
import { embeddingsModel } from "../config/ai.js";
import { estimateTokens } from "../utils/cost.js";

/** Embeds many texts (document chunks). LangChain batches the API calls for us. */
export async function embedTexts(texts: string[]) {
  const vectors = await embeddingsModel.embedDocuments(texts);
  const tokens = texts.reduce((sum, text) => sum + estimateTokens(text), 0);
  return { vectors, tokens };
}

/** Embeds a single text (the user's question). */
export async function embedQuery(text: string) {
  const vector = await embeddingsModel.embedQuery(text);
  return { vector, tokens: estimateTokens(text) };
}
