import type {
  AnalyticsResponse,
  ChatResponse,
  DocumentStatus,
  SearchResultItem,
  TokenResponse,
  UserPublic,
} from "../types";

const TOKEN_KEY = "nexus_ai_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!(options.body instanceof FormData) && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`/api${path}`, { ...options, headers });

  if (response.status === 204) {
    return undefined as T;
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = data?.detail || `Request failed with status ${response.status}`;
    throw new ApiError(response.status, typeof message === "string" ? message : JSON.stringify(message));
  }

  return data as T;
}

export const api = {
  // --- Auth ---
  register: (name: string, email: string, password: string) =>
    request<TokenResponse>("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }),

  login: (email: string, password: string) =>
    request<TokenResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  me: () => request<UserPublic>("/auth/me"),

  // --- Documents ---
  listDocuments: () => request<{ documents: DocumentStatus[]; total: number }>("/documents"),

  uploadDocument: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<DocumentStatus>("/documents/upload", { method: "POST", body: form });
  },

  deleteDocument: (id: string) => request<void>(`/documents/${id}`, { method: "DELETE" }),

  async downloadDocument(id: string, filename: string): Promise<void> {
    const token = getToken();
    const response = await fetch(`/api/documents/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new ApiError(response.status, "Download failed.");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  },

  // --- Search ---
  search: (query: string, topK?: number) =>
    request<{ query: string; results: SearchResultItem[]; took_ms: number }>("/search", {
      method: "POST",
      body: JSON.stringify({ query, top_k: topK }),
    }),

  // --- Chat ---
  chat: (question: string, documentIds?: string[]) =>
    request<ChatResponse>("/chat", { method: "POST", body: JSON.stringify({ question, document_ids: documentIds }) }),

  // --- Compare ---
  compare: (documentIdA: string, documentIdB: string, focusQuestion?: string) =>
    request<{ document_a: string; document_b: string; analysis: string; citations: any[]; generation_mode: string }>(
      "/compare",
      {
        method: "POST",
        body: JSON.stringify({ document_id_a: documentIdA, document_id_b: documentIdB, focus_question: focusQuestion }),
      }
    ),

  // --- Analytics ---
  analytics: () => request<AnalyticsResponse>("/analytics"),
};

export { ApiError };
