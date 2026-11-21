"""
Pydantic schemas shared across API routes. Keeping these separate from the
internal data models enforces a clean boundary between what the API exposes
and how data is stored internally.
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, EmailStr


# ---------- Auth ----------

class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserPublic"


class UserPublic(BaseModel):
    id: str
    name: str
    email: str
    role: str
    created_at: datetime


# ---------- Documents ----------

class DocumentStatus(BaseModel):
    id: str
    filename: str
    original_filename: str
    status: str  # "processing" | "completed" | "failed"
    error_message: Optional[str] = None
    page_count: int = 0
    chunk_count: int = 0
    size_bytes: int = 0
    uploaded_at: datetime
    processed_at: Optional[datetime] = None


class DocumentListResponse(BaseModel):
    documents: List[DocumentStatus]
    total: int


# ---------- Search ----------

class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    top_k: Optional[int] = None
    document_ids: Optional[List[str]] = None


class SearchResultItem(BaseModel):
    chunk_id: str
    document_id: str
    document_name: str
    page_number: int
    text: str
    similarity_score: float


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResultItem]
    took_ms: float


# ---------- Chat / RAG ----------

class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    document_ids: Optional[List[str]] = None
    conversation_id: Optional[str] = None


class Citation(BaseModel):
    citation_ref: str
    document_id: str
    document_name: str
    page_number: int
    excerpt: str
    similarity_score: float


class ChatResponse(BaseModel):
    answer: str
    citations: List[Citation]
    sufficient_evidence: bool
    pipeline_stages: List[dict]
    generation_mode: str  # "llm" | "demo_extractive"
    took_ms: float


# ---------- Compare ----------

class CompareRequest(BaseModel):
    document_id_a: str
    document_id_b: str
    focus_question: Optional[str] = None


class CompareResponse(BaseModel):
    document_a: str
    document_b: str
    analysis: str
    citations: List[Citation]
    generation_mode: str


# ---------- Analytics ----------

class AnalyticsResponse(BaseModel):
    total_documents: int
    processed_documents: int
    failed_documents: int
    processing_documents: int
    total_chunks: int
    total_queries: int
    average_latency_ms: Optional[float]
    recent_uploads: List[DocumentStatus]
    queries_last_7_days: List[dict]


TokenResponse.model_rebuild()
