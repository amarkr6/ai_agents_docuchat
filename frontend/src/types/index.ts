/**
 * FILE: types/index.ts
 * PURPOSE: TypeScript types that mirror the JSON returned by the backend API.
 * Sharing these types across components keeps the UI type-safe.
 */

export type UserRole = "admin" | "editor" | "viewer";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}

/** Every API response is wrapped like this by the backend. */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface AuthResult {
  user: User;
  token: string;
}

// ---------- Documents ----------
export type DocumentStatus = "processing" | "ready" | "failed";

export interface PersonRef {
  _id: string;
  name: string;
  email: string;
}

export interface DocumentItem {
  _id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  errorMessage: string | null;
  pageCount: number;
  chunkCount: number;
  embeddingCostUsd: number;
  isPublic: boolean;
  owner: PersonRef;
  sharedWith: PersonRef[];
  canManage: boolean;
  createdAt: string;
}

// ---------- Chats ----------
export interface Citation {
  index: number;
  documentId: string;
  fileName: string;
  pageNumber: number | null;
  chunkIndex: number;
  score: number;
  snippet: string;
  usedInAnswer: boolean;
}

export interface ChatMessage {
  _id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  createdAt: string;
}

export interface ChatSummary {
  _id: string;
  title: string;
  updatedAt: string;
}

export type Feedback = "up" | "down" | null;

export interface ChatDetail extends ChatSummary {
  messages: ChatMessage[];
  documentIds: string[];
  feedbackByMessage: Record<string, Feedback>;
}

export interface QueryMetrics {
  retrievalTimeMs: number;
  llmTimeMs: number;
  totalTimeMs: number;
  chunksRetrieved: number;
  topScore: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface AskResult {
  chatId: string;
  chatTitle: string;
  message: ChatMessage;
  metrics: QueryMetrics;
}

// ---------- Metrics ----------
export interface MetricsSummary {
  scope: string;
  questions: {
    total: number;
    avgTotalTimeMs: number;
    avgRetrievalTimeMs: number;
    avgLlmTimeMs: number;
    maxTotalTimeMs: number;
  };
  quality: {
    avgTopScore: number;
    avgCitationsUsed: number;
    thumbsUp: number;
    thumbsDown: number;
    satisfactionRate: number | null;
  };
  cost: {
    totalInputTokens: number;
    totalOutputTokens: number;
    queryCostUsd: number;
    embeddingCostUsd: number;
    totalCostUsd: number;
  };
  documents: { total: number; totalChunks: number };
  recentQueries: Array<{
    _id: string;
    question: string;
    totalTimeMs: number;
    retrievalTimeMs: number;
    llmTimeMs: number;
    topScore: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    feedback: Feedback;
    createdAt: string;
  }>;
}

export interface EvalCase {
  question: string;
  expectedDocumentId: string;
  expectedPage?: number;
}

export interface EvalResult {
  topK: number;
  totalCases: number;
  hitRate: number;
  mrr: number;
  avgRetrievalTimeMs: number;
  results: Array<{
    question: string;
    found: boolean;
    rank: number | null;
    topScore: number;
    retrievalTimeMs: number;
  }>;
}
