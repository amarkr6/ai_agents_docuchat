/**
 * FILE: services/chat.service.ts
 * PURPOSE: Read / rename / delete chat conversations (chat history).
 *
 * Asking a NEW question lives in rag.service.ts. Every query here is filtered
 * by `user: user.id` so users can only ever see their own chats.
 */
import { Chat } from "../models/Chat.js";
import { QueryLog } from "../models/QueryLog.js";
import type { AuthUser } from "../types/express.js";
import { AppError } from "../utils/AppError.js";

/** Sidebar list: titles only (no messages) for speed. */
export async function listChats(user: AuthUser) {
  return Chat.find({ user: user.id }).select("title updatedAt createdAt").sort({ updatedAt: -1 });
}

/** One chat with all its messages, plus feedback already given on each answer. */
export async function getChat(user: AuthUser, chatId: string) {
  const chat = await Chat.findOne({ _id: chatId, user: user.id });
  if (!chat) throw new AppError("Chat not found", 404);

  // Attach 👍/👎 so the UI can show which answers were already rated
  const logs = await QueryLog.find({ chat: chat._id }).select("messageId feedback");
  const feedbackByMessage = Object.fromEntries(logs.map((log) => [String(log.messageId), log.feedback]));

  return { ...chat.toObject(), feedbackByMessage };
}

export async function renameChat(user: AuthUser, chatId: string, title: string) {
  const chat = await Chat.findOneAndUpdate({ _id: chatId, user: user.id }, { title }, { returnDocument: "after" });
  if (!chat) throw new AppError("Chat not found", 404);
  return chat;
}

export async function deleteChat(user: AuthUser, chatId: string) {
  const chat = await Chat.findOneAndDelete({ _id: chatId, user: user.id });
  if (!chat) throw new AppError("Chat not found", 404);
}
