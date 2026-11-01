/**
 * FILE: models/User.ts
 * PURPOSE: Mongoose schema for application users ("users" collection).
 *
 * Roles (Role-Based Access Control):
 *   - admin  : manage users/roles, see ALL documents and global metrics
 *   - editor : upload documents, share them, chat with them   (default role)
 *   - viewer : can only chat with documents shared with them or public ones
 */
import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

export const USER_ROLES = ["admin", "editor", "viewer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // "select: false" = password hash is NEVER returned by queries unless we ask
    // for it explicitly with .select("+password"). Prevents accidental leaks.
    password: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: "editor" },
  },
  { timestamps: true }, // adds createdAt + updatedAt automatically
);

export type UserFields = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserFields>;

export const User = model("User", userSchema);
