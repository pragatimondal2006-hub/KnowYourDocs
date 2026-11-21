"""
Centralized application configuration.

All tunable parameters live here so the rest of the codebase never hardcodes
magic numbers or paths. Values can be overridden via environment variables
(see .env.example).
"""
from pathlib import Path
from typing import Optional

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- General ---
    APP_NAME: str = "NEXUS AI"
    ENV: str = "development"

    # --- Storage paths ---
    # Only BASE_DIR, UPLOAD_DIR and STORAGE_DIR are meant to be overridden
    # (e.g. by tests, to redirect all persistence to a throwaway directory).
    # The individual file paths below are intentionally left as Optional and
    # are derived from STORAGE_DIR/UPLOAD_DIR in the validator below, so that
    # overriding STORAGE_DIR via env/constructor always takes effect -- a
    # literal `BASE_DIR / "storage" / "x.json"` default evaluated once at
    # class-definition time would silently ignore any override.
    BASE_DIR: Path = _DEFAULT_BASE_DIR
    UPLOAD_DIR: Optional[Path] = None
    STORAGE_DIR: Optional[Path] = None
    METADATA_DB_PATH: Optional[Path] = None
    USERS_DB_PATH: Optional[Path] = None
    FAISS_INDEX_PATH: Optional[Path] = None
    VECTORIZER_PATH: Optional[Path] = None
    QUERY_LOG_PATH: Optional[Path] = None

    @model_validator(mode="after")
    def _derive_storage_paths(self) -> "Settings":
        if self.UPLOAD_DIR is None:
            self.UPLOAD_DIR = self.BASE_DIR / "uploads"
        if self.STORAGE_DIR is None:
            self.STORAGE_DIR = self.BASE_DIR / "storage"
        if self.METADATA_DB_PATH is None:
            self.METADATA_DB_PATH = self.STORAGE_DIR / "metadata.json"
        if self.USERS_DB_PATH is None:
            self.USERS_DB_PATH = self.STORAGE_DIR / "users.json"
        if self.FAISS_INDEX_PATH is None:
            self.FAISS_INDEX_PATH = self.STORAGE_DIR / "vector.index"
        if self.VECTORIZER_PATH is None:
            self.VECTORIZER_PATH = self.STORAGE_DIR / "vectorizer.joblib"
        if self.QUERY_LOG_PATH is None:
            self.QUERY_LOG_PATH = self.STORAGE_DIR / "query_log.json"
        return self

    # --- Upload constraints ---
    MAX_FILE_SIZE_MB: int = 25
    ALLOWED_EXTENSIONS: tuple = (".pdf",)

    # --- Chunking ---
    CHUNK_SIZE_CHARS: int = 1000
    CHUNK_OVERLAP_CHARS: int = 150

    # --- Embeddings ---
    # Preferred: sentence-transformers/all-MiniLM-L6-v2 (384-dim neural embedding).
    # This sandboxed environment has no network access to huggingface.co, so the
    # pretrained model weights cannot be downloaded here. EMBEDDING_BACKEND
    # controls which implementation is used; set it to "sentence-transformers"
    # in an environment that *can* reach huggingface.co to use the real model
    # with zero code changes elsewhere (see services/embedding_service.py).
    EMBEDDING_BACKEND: str = "tfidf-svd"  # "tfidf-svd" | "sentence-transformers"
    SENTENCE_TRANSFORMER_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_DIM: int = 384

    # --- Retrieval ---
    TOP_K: int = 5
    MIN_SIMILARITY_SCORE: float = 0.15

    # --- LLM ---
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-5-20250929"
    LLM_MAX_TOKENS: int = 1024

    # --- Auth ---
    JWT_SECRET: str = "CHANGE_ME_INSECURE_DEV_ONLY_SECRET"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24

    # --- CORS ---
    CORS_ORIGINS: tuple = ("http://localhost:5173", "http://127.0.0.1:5173")


settings = Settings()

# Ensure storage directories exist at import time.
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
