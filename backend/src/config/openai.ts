/**
 * FILE: config/openai.ts
 * PURPOSE: Create the two OpenAI clients (through LangChain) ONCE and share them.
 *
 *   embeddingsModel -> turns text into vectors (used for chunks AND questions)
 *   chatModel       -> the LLM that writes the final answer
 *
 * LangChain wraps the OpenAI API with a common interface, so switching to
 * another provider later (Azure OpenAI, Anthropic, …) only changes this file.
 */
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { env } from "./env.js";

export const embeddingsModel = new OpenAIEmbeddings({
  apiKey: env.OPENAI_API_KEY,
  model: env.OPENAI_EMBEDDING_MODEL,
  dimensions: env.EMBEDDING_DIMENSIONS,
  batchSize: 100, // send at most 100 chunks per API call
  maxRetries: 3, // automatic retry on rate limits / network errors
});

export const chatModel = new ChatOpenAI({
  apiKey: env.OPENAI_API_KEY,
  model: env.OPENAI_CHAT_MODEL,
  maxRetries: 2,
});
