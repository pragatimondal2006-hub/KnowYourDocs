export interface UserPublic {
  id: string;
  name: string;
  email: string;
  role: "Administrator" | "Manager" | "Employee";
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserPublic;
}

export type DocumentStatusValue = "processing" | "completed" | "failed";

export interface DocumentStatus {
  id: string;
  filename: string;
  original_filename: string;
  status: DocumentStatusValue;
  error_message: string | null;
  page_count: number;
  chunk_count: number;
  size_bytes: number;
  uploaded_at: string;
  processed_at: string | null;
}

export interface SearchResultItem {
  chunk_id: string;
  document_id: string;
  document_name: string;
  page_number: number;
  text: string;
  similarity_score: number;
}

export interface Citation {
  citation_ref: string;
  document_id: string;
  document_name: string;
  page_number: number;
  excerpt: string;
  similarity_score: number;
}

export interface PipelineStage {
  stage: string;
  status: "completed" | "skipped" | "error";
  detail: string;
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
  sufficient_evidence: boolean;
  pipeline_stages: PipelineStage[];
  generation_mode: "llm" | "demo_extractive" | "no_evidence";
  took_ms: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  generationMode?: ChatResponse["generation_mode"];
  pipelineStages?: PipelineStage[];
  timestamp: string;
}

export interface AnalyticsResponse {
  total_documents: number;
  processed_documents: number;
  failed_documents: number;
  processing_documents: number;
  total_chunks: number;
  total_queries: number;
  average_latency_ms: number | null;
  recent_uploads: DocumentStatus[];
  queries_last_7_days: { date: string; queries: number }[];
}
