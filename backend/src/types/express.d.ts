/**
 * FILE: types/express.d.ts
 * PURPOSE: Teach TypeScript that `req.user` exists on Express requests.
 *
 * The auth middleware puts the logged-in user on `req.user`. Without this file
 * TypeScript would complain "Property 'user' does not exist on type Request".
 */
import type { UserRole } from "../models/User.js";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
