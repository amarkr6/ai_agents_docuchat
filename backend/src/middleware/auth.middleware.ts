/**
 * FILE: middleware/auth.middleware.ts
 * PURPOSE: Protect routes so only logged-in users can call them.
 *
 * Flow:
 *   1. Frontend sends header:  Authorization: Bearer <JWT token>
 *   2. We verify the token signature with JWT_SECRET (proves we issued it).
 *   3. We load the user from MongoDB (so a deleted user or a changed role
 *      takes effect immediately, even if the old token is still valid).
 *   4. We attach the user to `req.user` for the next handlers.
 */
import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/auth.service.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError("Please log in to continue", 401);
  }

  const token = header.slice("Bearer ".length);
  const payload = verifyToken(token); // throws 401 if invalid/expired

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new AppError("User no longer exists", 401);
  }

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  next();
}
