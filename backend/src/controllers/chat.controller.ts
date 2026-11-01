/**
 * FILE: controllers/chat.controller.ts
 * PURPOSE: HTTP handlers for /api/chats/* (ask questions + chat history).
 */
import type { Request, Response } from "express";
import * as ragService from "../services/rag.service.js";
import * as chatService from "../services/chat.service.js";
import * as metricsService from "../services/metrics.service.js";

/**
 * POST /api/chats/ask
 * body: { question, chatId?, documentIds? }
 * Without chatId a new chat is created. Returns the answer + citations + metrics.
 */
export async function ask(req: Request, res: Response) {
  const { question, chatId, documentIds } = req.body;
  const result = await ragService.askQuestion({ user: req.user!, question, chatId, documentIds });
  res.json({ success: true, data: result });
}

/** GET /api/chats  -> sidebar list of the user's chats */
export async function list(req: Request, res: Response) {
  const chats = await chatService.listChats(req.user!);
  res.json({ success: true, data: chats });
}

/** GET /api/chats/:id  -> one chat with all messages */
export async function getOne(req: Request<{ id: string }>, res: Response) {
  const chat = await chatService.getChat(req.user!, req.params.id);
  res.json({ success: true, data: chat });
}

/** PATCH /api/chats/:id  body: { title } */
export async function rename(req: Request<{ id: string }>, res: Response) {
  const chat = await chatService.renameChat(req.user!, req.params.id, req.body.title);
  res.json({ success: true, data: chat });
}

/** DELETE /api/chats/:id */
export async function remove(req: Request<{ id: string }>, res: Response) {
  await chatService.deleteChat(req.user!, req.params.id);
  res.json({ success: true, message: "Chat deleted" });
}

/** POST /api/chats/messages/:messageId/feedback  body: { feedback: "up" | "down" | null } */
export async function feedback(req: Request<{ messageId: string }>, res: Response) {
  const result = await metricsService.setFeedback(req.user!, req.params.messageId, req.body.feedback);
  res.json({ success: true, data: result });
}
