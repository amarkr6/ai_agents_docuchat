/**
 * FILE: services/auth.service.ts
 * PURPOSE: All authentication logic — register, login, password hashing, JWT.
 *
 * Passwords are NEVER stored in plain text. bcrypt turns "secret123" into a
 * one-way hash like "$2b$10$...". On login we hash the typed password the same
 * way and compare.
 *
 * After login we give the user a JWT (JSON Web Token). It is a signed string
 * containing the user id; the frontend sends it with every request.
 */
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import { User, type UserDocument, type UserRole } from "../models/User.js";
import { AppError } from "../utils/AppError.js";

const SALT_ROUNDS = 10; // higher = slower = harder to brute-force

/** What we put inside the JWT. "sub" (subject) is the standard field for the user id. */
interface TokenPayload {
  sub: string;
  role: UserRole;
}

/** Safe user object to send to the frontend (no password!). */
export function toPublicUser(user: UserDocument) {
  return {
    id: user.id as string,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

/** Creates a signed JWT for the user. */
export function signToken(user: UserDocument): string {
  const payload: TokenPayload = { sub: user.id, role: user.role };
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

/** Verifies a JWT and returns its payload. Throws 401 if invalid or expired. */
export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as unknown as TokenPayload;
  } catch {
    throw new AppError("Your session is invalid or has expired. Please log in again.", 401);
  }
}

/**
 * Registers a new user.
 * The FIRST user who ever registers becomes "admin" automatically, so you can
 * manage roles without touching the database by hand.
 */
export async function registerUser(name: string, email: string, password: string) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError("An account with this email already exists", 409);
  }

  const isFirstUser = (await User.countDocuments()) === 0;
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await User.create({
    name,
    email,
    password: passwordHash,
    role: isFirstUser ? "admin" : "editor",
  });

  return { user: toPublicUser(user), token: signToken(user) };
}

/** Checks email + password and returns a fresh token. */
export async function loginUser(email: string, password: string) {
  // .select("+password") because password has select:false in the schema
  const user = await User.findOne({ email }).select("+password");

  // Same message for "no user" and "wrong password" -> attackers can't tell
  // which emails are registered.
  const isValid = user ? await bcrypt.compare(password, user.password) : false;
  if (!user || !isValid) {
    throw new AppError("Invalid email or password", 401);
  }

  return { user: toPublicUser(user), token: signToken(user) };
}

/** Returns the profile of the logged-in user. */
export async function getUserById(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);
  return toPublicUser(user);
}
