/**
 * FILE: middleware/error.middleware.ts
 * PURPOSE: ONE central place that converts every error into a JSON response.
 *
 * Express 5 automatically forwards errors thrown inside async handlers to this
 * middleware — so controllers can simply `throw` (no try/catch everywhere).
 *
 * Response shape for every error:
 *     { "success": false, "message": "...", "details"?: [...] }
 */
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";
import multer from "multer";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

/** Runs when no route matched the URL -> 404. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

/** Global error handler (Express recognises it because it has 4 arguments). */
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  // 1. Our own errors (thrown with `new AppError(message, status)`)
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }

  // 2. Invalid request body (zod validation)
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      details: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
    });
  }

  // 3. Upload problems (e.g. file too large)
  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE" ? `File is larger than ${env.MAX_UPLOAD_MB} MB` : error.message;
    return res.status(400).json({ success: false, message });
  }

  // 4. Invalid MongoDB id in the URL (e.g. /api/documents/abc)
  if (error instanceof mongoose.Error.CastError) {
    return res.status(400).json({ success: false, message: `Invalid ${error.path}: ${error.value}` });
  }

  // 5. Unique index violation (e.g. email already registered)
  if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
    return res.status(409).json({ success: false, message: "This record already exists" });
  }

  // 6. Anything else = unexpected bug. Log it, hide internals in production.
  logger.error("Unhandled error", error);
  const message = env.isProduction ? "Something went wrong" : String((error as Error)?.message ?? error);
  return res.status(500).json({ success: false, message });
}
