/**
 * FILE: api/chats.api.ts
 * PURPOSE: Functions that call the backend /api/chats endpoints.
 */
import { api } from "./client";
import type { ApiResponse, AskResult, ChatDetail, ChatSummary, Feedback } from "../types";

export async function listChatsApi() {
  const response = await api.get<ApiResponse<ChatSummary[]>>("/chats");
  return response.data.data;
}

export async function getChatApi(chatId: string) {
  const response = await api.get<ApiResponse<ChatDetail>>(`/chats/${chatId}`);
  return response.data.data;
}

/** How long the browser waits for an answer before showing a "try again" message. */
const ASK_TIMEOUT_MS = 60_000;

/** Sends a question. Without chatId the backend starts a new chat. */
export async function askQuestionApi(question: string, chatId?: string, documentIds?: string[]) {
  const response = await api.post<ApiResponse<AskResult>>(
    "/chats/ask",
    { question, chatId, documentIds },
    { timeout: ASK_TIMEOUT_MS }, // stop the spinner if the AI service is too slow
  );
  return response.data.data;
}

export async function renameChatApi(chatId: string, title: string) {
  await api.patch(`/chats/${chatId}`, { title });
}

export async function deleteChatApi(chatId: string) {
  await api.delete(`/chats/${chatId}`);
}

export async function sendFeedbackApi(messageId: string, feedback: Feedback) {
  await api.post(`/chats/messages/${messageId}/feedback`, { feedback });
}
