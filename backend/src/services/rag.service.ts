/**
 * FILE: services/rag.service.ts
 * PURPOSE: The heart of the app — answer a question using RAG
 *          (Retrieval-Augmented Generation).
 *
 * QUESTION PIPELINE (the "query" half of RAG):
 *   1. Find which documents the user is allowed to search
 *   2. Embed the question                       (Gemini or OpenAI embeddings)
 *   3. Retrieve the top-K most similar chunks   (Atlas Vector Search)
 *   4. Build a prompt = instructions + numbered chunks + chat history + question
 *   5. Ask the LLM, which answers and cites sources like [1], [2]
 *   6. Save both messages + citations to the chat (chat history)
 *   7. Save a QueryLog row with timing, tokens and cost (monitoring)
 */
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { AIMessage, HumanMessage, type BaseMessage } from "@langchain/core/messages";
import { Types } from "mongoose";
import { chatModel } from "../config/ai.js";
import { env } from "../config/env.js";
import { Chat, type ChatDoc } from "../models/Chat.js";
import { QueryLog } from "../models/QueryLog.js";
import type { AuthUser } from "../types/express.js";
import { getQueryableDocumentIds } from "./document.service.js";
import { embedQuery } from "./embedding.service.js";
import { searchSimilarChunks, type SearchResult } from "./vectorSearch.service.js";
import { chatCost, embeddingCost } from "../utils/cost.js";
import { AppError } from "../utils/AppError.js";

const HISTORY_MESSAGES = 6; // how many previous messages the AI "remembers"

// ---------------------------------------------------------------------------
// Prompt (LangChain template). {context} and {question} are filled at runtime.
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are a helpful assistant that answers questions about the user's documents.

Rules:
- Answer ONLY using the numbered context passages provided with the question.
- After every fact, cite the passage number in square brackets, e.g. [1] or [2][3].
- If the context does not contain the answer, say: "I couldn't find this in your documents."
- Never invent facts, page numbers or sources.
- Be clear and concise. Use bullet points for lists.`;

const promptTemplate = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM_PROMPT],
  new MessagesPlaceholder("history"), // previous turns of the conversation
  ["human", "Context passages:\n{context}\n\nQuestion: {question}"],
]);

// prompt -> model. ".pipe" creates a LangChain "chain" (LCEL).
const answerChain = promptTemplate.pipe(chatModel);

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/** Formats retrieved chunks as numbered passages the LLM can cite. */
function buildContext(results: SearchResult[]): string {
  return results
    .map((r, i) => {
      const page = r.pageNumber ? `, page ${r.pageNumber}` : "";
      return `[${i + 1}] (Source: ${r.fileName}${page})\n${r.text}`;
    })
    .join("\n\n---\n\n");
}

/** Converts saved chat messages into LangChain message objects. */
function buildHistory(chat: ChatDoc): BaseMessage[] {
  return chat.messages
    .slice(-HISTORY_MESSAGES)
    .map((m) => (m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)));
}

/** Finds which [n] numbers the AI actually used in its answer. */
function findCitedNumbers(answer: string): Set<number> {
  const matches = answer.matchAll(/\[(\d+)\]/g);
  return new Set([...matches].map((m) => Number(m[1])));
}

/** The LLM's content can be a string or an array of parts — normalise to string. */
function contentToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => (typeof part === "string" ? part : (part?.text ?? ""))).join("");
  }
  return String(content ?? "");
}

/** Loads the user's chat, or creates a new one when no chatId is given. */
async function getOrCreateChat(user: AuthUser, question: string, chatId?: string, documentIds?: string[]) {
  if (chatId) {
    const chat = await Chat.findOne({ _id: chatId, user: user.id });
    if (!chat) throw new AppError("Chat not found", 404);
    return chat;
  }
  return Chat.create({
    user: user.id,
    title: question.length > 60 ? `${question.slice(0, 57)}...` : question,
    documentIds: documentIds ?? [],
  });
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

interface AskInput {
  user: AuthUser;
  question: string;
  chatId?: string;
  documentIds?: string[]; // optional: limit the search to these documents
}

export async function askQuestion({ user, question, chatId, documentIds }: AskInput) {
  const totalStart = performance.now();

  // Load (or create) the conversation
  const chat = await getOrCreateChat(user, question, chatId, documentIds);
  const scopeIds = chat.documentIds.length > 0 ? chat.documentIds.map(String) : documentIds;

  // ---- 1-3. RETRIEVAL ----------------------------------------------------
  const retrievalStart = performance.now();
  const allowedIds = await getQueryableDocumentIds(user, scopeIds);
  const { vector, tokens: questionTokens } = await embedQuery(question);
  const results = await searchSimilarChunks(vector, allowedIds);
  const retrievalTimeMs = Math.round(performance.now() - retrievalStart);

  // ---- 4-5. GENERATION ---------------------------------------------------
  const llmStart = performance.now();
  let answer: string;
  let inputTokens = 0;
  let outputTokens = 0;

  if (results.length === 0) {
    // Nothing to search -> don't waste an LLM call
    answer =
      allowedIds.length === 0
        ? "You don't have any processed documents yet. Upload a document on the Documents page first."
        : "I couldn't find anything related to your question in your documents.";
  } else {
    const response = await answerChain.invoke({
      history: buildHistory(chat),
      context: buildContext(results),
      question,
    });
    answer = contentToString(response.content);
    inputTokens = response.usage_metadata?.input_tokens ?? 0;
    outputTokens = response.usage_metadata?.output_tokens ?? 0;
  }
  const llmTimeMs = Math.round(performance.now() - llmStart);

  // ---- Citations ---------------------------------------------------------
  const citedNumbers = findCitedNumbers(answer);
  const citations = results.map((r, i) => ({
    index: i + 1,
    documentId: new Types.ObjectId(r.documentId),
    fileName: r.fileName,
    pageNumber: r.pageNumber,
    chunkIndex: r.chunkIndex,
    score: Number(r.score.toFixed(4)),
    snippet: r.text.length > 300 ? `${r.text.slice(0, 300)}…` : r.text,
    usedInAnswer: citedNumbers.has(i + 1),
  }));

  // ---- 6. Save chat history ----------------------------------------------
  chat.messages.push({ role: "user", content: question });
  chat.messages.push({ role: "assistant", content: answer, citations });
  await chat.save();
  const assistantMessage = chat.messages[chat.messages.length - 1];

  // ---- 7. Save monitoring metrics ----------------------------------------
  const totalTimeMs = Math.round(performance.now() - totalStart);
  const scores = results.map((r) => r.score);
  const costUsd = chatCost(inputTokens, outputTokens) + embeddingCost(questionTokens);

  const metrics = {
    retrievalTimeMs,
    llmTimeMs,
    totalTimeMs,
    chunksRetrieved: results.length,
    topScore: scores.length ? Math.max(...scores) : 0,
    avgScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    citationsUsed: citations.filter((c) => c.usedInAnswer).length,
    inputTokens,
    outputTokens,
    embeddingTokens: questionTokens,
    costUsd,
  };

  await QueryLog.create({
    user: user.id,
    chat: chat._id,
    messageId: assistantMessage._id,
    question,
    model: env.chatModel,
    ...metrics,
  });

  return {
    chatId: chat.id as string,
    chatTitle: chat.title,
    message: assistantMessage,
    metrics,
  };
}
