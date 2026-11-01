/**
 * FILE: controllers/auth.controller.ts
 * PURPOSE: HTTP handlers for /api/auth/*.
 *
 * Controllers are intentionally THIN: read the request, call a service,
 * send the response. All business logic lives in services/.
 */
import type { Request, Response } from "express";
import * as authService from "../services/auth.service.js";

/** POST /api/auth/register  -> creates an account and returns { user, token } */
export async function register(req: Request, res: Response) {
  const { name, email, password } = req.body;
  const result = await authService.registerUser(name, email, password);
  res.status(201).json({ success: true, data: result });
}

/** POST /api/auth/login  -> returns { user, token } */
export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const result = await authService.loginUser(email, password);
  res.json({ success: true, data: result });
}

/** GET /api/auth/me  -> returns the logged-in user's profile */
export async function me(req: Request, res: Response) {
  const user = await authService.getUserById(req.user!.id);
  res.json({ success: true, data: user });
}
