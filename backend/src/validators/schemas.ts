/**
 * FILE: validators/schemas.ts
 * PURPOSE: zod schemas describing what each request body must look like.
 *
 * Used with the validateBody() middleware. Keeping validation here means
 * controllers can trust req.body completely.
 */
import { z } from "zod";
import { USER_ROLES } from "../models/User.js";

// A 24-character hex string = valid MongoDB ObjectId
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

// ---------- Auth ----------
export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  email: z.email("Invalid email").trim().toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export const loginSchema = z.object({
  email: z.email("Invalid email").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

// ---------- Documents ----------
export const shareDocumentSchema = z.object({
  emails: z.array(z.email().trim().toLowerCase()).default([]),
  isPublic: z.boolean().default(false),
});

// ---------- Chat ----------
export const askQuestionSchema = z.object({
  question: z.string().trim().min(2, "Question is too short").max(2000),
  chatId: objectId.optional(),
  documentIds: z.array(objectId).optional(),
});

export const renameChatSchema = z.object({
  title: z.string().trim().min(1).max(100),
});

export const feedbackSchema = z.object({
  feedback: z.enum(["up", "down"]).nullable(),
});

// ---------- Metrics ----------
export const evaluateSchema = z.object({
  topK: z.number().int().min(1).max(20).default(5),
  cases: z
    .array(
      z.object({
        question: z.string().trim().min(2),
        expectedDocumentId: objectId,
        expectedPage: z.number().int().positive().optional(),
      }),
    )
    .min(1, "Add at least one test case")
    .max(50, "Maximum 50 test cases per run"),
});

// ---------- Admin ----------
export const updateRoleSchema = z.object({
  role: z.enum(USER_ROLES),
});
