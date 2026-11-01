/**
 * FILE: pages/DocumentsPage.tsx
 * PURPOSE: Upload documents, see their processing status, share or delete them.
 *
 * After upload the backend processes the file in the background, so this page
 * re-loads the list every 3 seconds while any document is still "processing".
 */
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { deleteDocumentApi, listDocumentsApi, uploadDocumentApi } from "../api/documents.api";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ShareDialog } from "../components/ShareDialog";
import { Spinner } from "../components/Spinner";
import type { DocumentItem } from "../types";

const ACCEPTED_TYPES = ".pdf,.docx,.txt,.md";

const STATUS_STYLE: Record<string, string> = {
  processing: "bg-amber-100 text-amber-800",
  ready: "bg-brand-100 text-brand-700",
  failed: "bg-red-100 text-red-700",
};

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentsPage() {
  const { user } = useAuth();
  const canUpload = user?.role === "admin" || user?.role === "editor";

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [shareTarget, setShareTarget] = useState<DocumentItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadDocuments() {
    try {
      setDocuments(await listDocumentsApi());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDocuments();
  }, []);

  // Poll while something is still processing
  const hasProcessing = documents.some((d) => d.status === "processing");
  useEffect(() => {
    if (!hasProcessing) return;
    const timer = setInterval(() => void loadDocuments(), 3000);
    return () => clearInterval(timer); // cleanup when status changes / page closes
  }, [hasProcessing]);

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setUploadProgress(0);
    try {
      await uploadDocumentApi(file, setUploadProgress);
      await loadDocuments();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploadProgress(null);
      event.target.value = ""; // allow selecting the same file again
    }
  }

  async function handleDelete(doc: DocumentItem) {
    if (!confirm(`Delete "${doc.originalName}" and all its data?`)) return;
    try {
      await deleteDocumentApi(doc._id);
      await loadDocuments();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Documents</h1>
            <p className="text-sm text-zinc-500">PDF, Word (.docx), TXT or Markdown files. Max 10 MB each.</p>
          </div>

          {canUpload ? (
            <>
              <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES} className="hidden" onChange={handleFileSelected} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadProgress !== null}
                className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {uploadProgress !== null ? `Uploading ${uploadProgress}%…` : "⬆ Upload document"}
              </button>
            </>
          ) : (
            <span className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-600">
              Viewers can't upload — ask an admin for the editor role.
            </span>
          )}
        </div>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {isLoading ? (
            <div className="flex justify-center p-10">
              <Spinner />
            </div>
          ) : documents.length === 0 ? (
            <p className="p-10 text-center text-zinc-500">No documents yet. Upload your first file to get started.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">Access</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {documents.map((doc) => (
                  <tr key={doc._id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{doc.originalName}</div>
                      <div className="text-xs text-zinc-500">
                        by {doc.owner?.name ?? "unknown"} · {new Date(doc.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[doc.status]}`}>
                        {doc.status}
                      </span>
                      {doc.errorMessage && <div className="mt-1 text-xs text-red-600">{doc.errorMessage}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600">
                      {formatSize(doc.sizeBytes)}
                      {doc.status === "ready" && (
                        <>
                          {" "}
                          · {doc.pageCount} page(s) · {doc.chunkCount} chunks
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600">
                      {doc.isPublic ? "🌍 Public" : doc.sharedWith.length > 0 ? `👥 ${doc.sharedWith.length} people` : "🔒 Private"}
                    </td>
                    <td className="space-x-2 px-4 py-3 text-right">
                      {doc.canManage && (
                        <>
                          <button onClick={() => setShareTarget(doc)} className="text-brand-700 hover:underline">
                            Share
                          </button>
                          <button onClick={() => handleDelete(doc)} className="text-red-600 hover:underline">
                            Delete
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => navigator.clipboard.writeText(doc._id)}
                        className="text-zinc-500 hover:underline"
                        title="Copy document id (used on the Metrics page evaluation)"
                      >
                        Copy ID
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {shareTarget && (
        <ShareDialog document={shareTarget} onClose={() => setShareTarget(null)} onSaved={loadDocuments} />
      )}
    </div>
  );
}
