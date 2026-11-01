/**
 * FILE: api/users.api.ts
 * PURPOSE: Functions that call the backend /api/users endpoints.
 */
import { api } from "./client";
import type { ApiResponse, PersonRef, User, UserRole } from "../types";

/** Name + email of all users (used by the "Share" dialog). */
export async function getUserDirectoryApi() {
  const response = await api.get<ApiResponse<PersonRef[]>>("/users/directory");
  return response.data.data;
}

/** Admin only: all users with roles. */
export async function listUsersApi() {
  const response = await api.get<ApiResponse<User[]>>("/users");
  return response.data.data;
}

/** Admin only: change a user's role. */
export async function updateUserRoleApi(userId: string, role: UserRole) {
  const response = await api.patch<ApiResponse<User>>(`/users/${userId}/role`, { role });
  return response.data.data;
}
