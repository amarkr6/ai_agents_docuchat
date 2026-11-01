/**
 * FILE: controllers/metrics.controller.ts
 * PURPOSE: HTTP handlers for /api/metrics/* (dashboard + retrieval evaluation).
 */
import type { Request, Response } from "express";
import * as metricsService from "../services/metrics.service.js";

/** GET /api/metrics/summary  -> speed, quality and cost numbers */
export async function summary(req: Request, res: Response) {
  const data = await metricsService.getSummary(req.user!);
  res.json({ success: true, data });
}

/**
 * POST /api/metrics/evaluate
 * body: { topK, cases: [{ question, expectedDocumentId, expectedPage? }] }
 * Returns Hit Rate@K and MRR.
 */
export async function evaluate(req: Request, res: Response) {
  const { cases, topK } = req.body;
  const data = await metricsService.evaluateRetrieval(req.user!, cases, topK);
  res.json({ success: true, data });
}
