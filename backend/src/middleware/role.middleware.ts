/**
 * FILE: middleware/role.middleware.ts
 * PURPOSE: Role-Based Access Control (RBAC) for routes.
 *
 * Usage in a route file:
 *     router.post("/upload", requireAuth, requireRole("admin", "editor"), handler)
 *
 * Must run AFTER requireAuth (because it reads req.user).
 */
import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "../models/User.js";
import { AppError } from "../utils/AppError.js";

export function requireRole(...allowedRoles: UserRole[]) {
  // Returns a middleware function configured with the allowed roles
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError("Please log in to continue", 401);
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(`This action requires one of these roles: ${allowedRoles.join(", ")}`, 403);
    }
    next();
  };
}
