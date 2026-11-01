/**
 * FILE: services/user.service.ts
 * PURPOSE: Admin-only user management (list users, change roles).
 */
import { User, type UserRole } from "../models/User.js";
import type { AuthUser } from "../types/express.js";
import { toPublicUser } from "./auth.service.js";
import { AppError } from "../utils/AppError.js";

export async function listUsers() {
  const users = await User.find().sort({ createdAt: 1 });
  return users.map(toPublicUser);
}

/** Lightweight list (name + email) any logged-in user can use to pick people to share with. */
export async function listUserDirectory() {
  return User.find().select("name email").sort({ name: 1 });
}

export async function updateUserRole(admin: AuthUser, userId: string, role: UserRole) {
  // Safety: an admin cannot remove their own admin rights (avoids locking everyone out)
  if (admin.id === userId && role !== "admin") {
    throw new AppError("You cannot remove your own admin role", 400);
  }

  const user = await User.findByIdAndUpdate(userId, { role }, { returnDocument: "after", runValidators: true });
  if (!user) throw new AppError("User not found", 404);
  return toPublicUser(user);
}
