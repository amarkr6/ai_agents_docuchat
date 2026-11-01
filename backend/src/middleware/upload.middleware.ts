/**
 * FILE: middleware/upload.middleware.ts
 * PURPOSE: Handle multipart/form-data file uploads using "multer".
 *
 * - Files are kept in MEMORY (req.file.buffer). We only need the text, so we
 *   never write the original file to disk.
 * - Only PDF, DOCX, TXT and Markdown files are accepted.
 * - Max size comes from MAX_UPLOAD_MB in .env.
 */
import multer from "multer";
import path from "node:path";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"];

export const uploadSingleFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(extension)) {
      callback(null, true);
    } else {
      callback(new AppError(`Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`, 400));
    }
  },
}).single("file"); // the form field name the frontend must use
