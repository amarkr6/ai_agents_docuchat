/**
 * FILE: api/documents.api.ts
 * PURPOSE: Functions that call the backend /api/documents endpoints.
 */
import { api } from "./client";
import type { ApiResponse, DocumentItem } from "../types";

export async function listDocumentsApi() {
  const response = await api.get<ApiResponse<DocumentItem[]>>("/documents");
  return response.data.data;
}

/** Uploads one file. FormData = the browser's way to send files (multipart/form-data). */
export async function uploadDocumentApi(file: File, onProgress?: (percent: number) => void) {
  const formData = new FormData();
  formData.append("file", file); // field name must match multer's .single("file")

  const response = await api.post<ApiResponse<DocumentItem>>("/documents", formData, {
    onUploadProgress: (event) => {
      if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
    },
  });
  return response.data.data;
}

export async function updateSharingApi(documentId: string, emails: string[], isPublic: boolean) {
  const response = await api.patch<ApiResponse<DocumentItem>>(`/documents/${documentId}/sharing`, {
    emails,
    isPublic,
  });
  return response.data.data;
}

export async function deleteDocumentApi(documentId: string) {
  await api.delete(`/documents/${documentId}`);
}
