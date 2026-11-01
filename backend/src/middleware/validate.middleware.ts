/**
 * FILE: middleware/validate.middleware.ts
 * PURPOSE: Validate the request body against a zod schema BEFORE the controller runs.
 *
 * Usage:
 *     router.post("/register", validateBody(registerSchema), authController.register)
 *
 * If the body is invalid, zod throws a ZodError and the global error handler
 * returns 400 with a readable list of problems. If valid, req.body is replaced
 * with the cleaned/parsed data (e.g. trimmed strings, defaults applied).
 */
import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body ?? {});
    next();
  };
}
