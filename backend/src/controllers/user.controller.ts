/**
 * FILE: controllers/user.controller.ts
 * PURPOSE: HTTP handlers for /api/users/* (directory + admin role management).
 */
import type { Request, Response } from "express";
import * as userService from "../services/user.service.js";

/** GET /api/users/directory  -> names + emails (for the "share with" picker) */
export async function directory(_req: Request, res: Response) {
  const users = await userService.listUserDirectory();
  res.json({ success: true, data: users });
}

/** GET /api/users  (admin) -> full user list with roles */
export async function list(_req: Request, res: Response) {
  const users = await userService.listUsers();
  res.json({ success: true, data: users });
}

/** PATCH /api/users/:id/role  (admin)  body: { role } */
export async function updateRole(req: Request<{ id: string }>, res: Response) {
  const user = await userService.updateUserRole(req.user!, req.params.id, req.body.role);
  res.json({ success: true, data: user });
}
