/**
 * FILE: api/auth.api.ts
 * PURPOSE: Functions that call the backend /api/auth endpoints.
 */
import { api } from "./client";
import type { ApiResponse, AuthResult, User } from "../types";

export async function registerApi(name: string, email: string, password: string) {
  const response = await api.post<ApiResponse<AuthResult>>("/auth/register", { name, email, password });
  return response.data.data;
}

export async function loginApi(email: string, password: string) {
  const response = await api.post<ApiResponse<AuthResult>>("/auth/login", { email, password });
  return response.data.data;
}

export async function getMeApi() {
  const response = await api.get<ApiResponse<User>>("/auth/me");
  return response.data.data;
}
