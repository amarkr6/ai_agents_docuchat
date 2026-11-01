/**
 * FILE: api/client.ts
 * PURPOSE: One shared axios instance used for EVERY backend call.
 *
 *  - baseURL comes from VITE_API_URL ("/api" in dev, full URL in production)
 *  - Request interceptor: automatically adds "Authorization: Bearer <token>"
 *  - Response interceptor: if the server says 401 (token expired), log out
 */
import axios, { AxiosError } from "axios";

export const TOKEN_STORAGE_KEY = "docuchat_token";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

// Runs BEFORE every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Runs AFTER every response
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const isAuthCall = error.config?.url?.startsWith("/auth/");
    if (error.response?.status === 401 && !isAuthCall) {
      // Session expired -> clear token and go to the login page
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

/** Turns any axios/network error into a human-readable message for the UI. */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    // Request took longer than its timeout (e.g. the AI free tier is busy)
    if (error.code === "ECONNABORTED") {
      return "The AI service is taking too long (the free tier may be busy). Please try again in a minute.";
    }
    const data = error.response?.data as { message?: string; details?: { message: string }[] } | undefined;
    if (data?.details?.length) return data.details.map((d) => d.message).join(", ");
    if (data?.message) return data.message;
    if (!error.response) return "Cannot reach the server. Is the backend running?";
  }
  return error instanceof Error ? error.message : "Something went wrong";
}
