/**
 * FILE: config/ai.ts
 * PURPOSE: Create the two AI clients (through LangChain) ONCE and share them.
 *
 *   embeddingsModel -> turns text into vectors (used for chunks AND questions)
 *   chatModel       -> the LLM that writes the final answer
 *
 * Which company provides them is decided by AI_PROVIDER in .env:
 *   - "gemini" -> Google Gemini (free tier available)
 *   - "openai" -> OpenAI
 *
 * This is the benefit of LangChain: both providers share the same interface
 * (embedDocuments, embedQuery, invoke…), so NO other file has to change when
 * we switch providers.
 */
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { Embeddings } from "@langchain/core/embeddings";
import { env } from "./env.js";

function createEmbeddingsModel(): Embeddings {
  if (env.AI_PROVIDER === "gemini") {
    return new GoogleGenerativeAIEmbeddings({
      apiKey: env.GOOGLE_API_KEY,
      model: env.embeddingModel,
      outputDimensionality: env.embeddingDimensions, // 768 = smaller + faster than the full 3072
      maxRetries: 6, // free tier has rate limits -> retry with backoff on "429 Too Many Requests"
      maxConcurrency: 1, // send one batch at a time to stay under the free-tier limits
    });
  }

  return new OpenAIEmbeddings({
    apiKey: env.OPENAI_API_KEY,
    model: env.embeddingModel,
    dimensions: env.embeddingDimensions,
    batchSize: 100, // send at most 100 chunks per API call
    maxRetries: 3, // automatic retry on rate limits / network errors
  });
}

function createChatModel(): BaseChatModel {
  if (env.AI_PROVIDER === "gemini") {
    return new ChatGoogleGenerativeAI({
      apiKey: env.GOOGLE_API_KEY,
      model: env.chatModel,
      maxRetries: 3,
    });
  }

  return new ChatOpenAI({
    apiKey: env.OPENAI_API_KEY,
    model: env.chatModel,
    maxRetries: 2,
  });
}

export const embeddingsModel = createEmbeddingsModel();
export const chatModel = createChatModel();
