/**
 * FILE: controllers/document.controller.ts
 * PURPOSE: HTTP handlers for /api/documents/* (upload, list, share, delete).
 */
import type { Request, Response } from "express";
import * as documentService from "../services/document.service.js";
import { AppError } from "../utils/AppError.js";

/** POST /api/documents  (multipart form, field "file") -> 202 Accepted, processing starts */
export async function upload(req: Request, res: Response) {
  if (!req.file) throw new AppError("Please attach a file in the 'file' field", 400);
  const document = await documentService.uploadDocument(req.user!, req.file);
  // 202 = "accepted, still working on it"
  res.status(202).json({ success: true, data: document });
}

/** GET /api/documents  -> all documents the user can see */
export async function list(req: Request, res: Response) {
  const documents = await documentService.listDocuments(req.user!);
  res.json({ success: true, data: documents });
}

/** PATCH /api/documents/:id/sharing  body: { emails: string[], isPublic: boolean } */
export async function updateSharing(req: Request<{ id: string }>, res: Response) {
  const { emails, isPublic } = req.body;
  const document = await documentService.updateSharing(req.user!, req.params.id, emails, isPublic);
  res.json({ success: true, data: document });
}

/** DELETE /api/documents/:id  -> removes document + its chunks */
export async function remove(req: Request<{ id: string }>, res: Response) {
  await documentService.deleteDocument(req.user!, req.params.id);
  res.json({ success: true, message: "Document deleted" });
}
