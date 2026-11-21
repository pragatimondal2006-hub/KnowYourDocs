"""
Lightweight persistent metadata store.

For the MVP, document/chunk/user/query metadata is stored as JSON on disk
rather than in-memory, so restarting the backend does not lose any indexed
data. The interface is intentionally narrow (get/list/save/delete) so it can
be swapped for a real database (e.g. PostgreSQL) later without touching
calling code -- see PART 14 of the project brief for the migration note.
"""
import json
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)
_lock = threading.Lock()


def _load(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as exc:
        logger.error("Failed to load metadata file %s: %s", path, exc)
        return {}


def _save(path: Path, data: Dict[str, Any]) -> None:
    tmp_path = path.with_suffix(".tmp")
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)
    tmp_path.replace(path)  # atomic write


class MetadataStore:
    """
    Stores three top-level collections, each persisted to its own JSON file:
      - documents: {document_id: {...}}
      - chunks:    {chunk_id: {...}}
      - users:     {user_id: {...}}
      - queries:   [ {...}, ... ]  (append-only log for analytics)
    """

    def __init__(self):
        self._documents_path = settings.METADATA_DB_PATH
        self._users_path = settings.USERS_DB_PATH
        self._queries_path = settings.QUERY_LOG_PATH

        with _lock:
            store = _load(self._documents_path)
            self.documents: Dict[str, dict] = store.get("documents", {})
            self.chunks: Dict[str, dict] = store.get("chunks", {})
            self.users: Dict[str, dict] = _load(self._users_path)
            queries_data = _load(self._queries_path)
            self.queries: List[dict] = queries_data.get("queries", []) if isinstance(queries_data, dict) else []

    # ---------- persistence ----------

    def _flush_documents(self) -> None:
        with _lock:
            _save(self._documents_path, {"documents": self.documents, "chunks": self.chunks})

    def _flush_users(self) -> None:
        with _lock:
            _save(self._users_path, self.users)

    def _flush_queries(self) -> None:
        with _lock:
            _save(self._queries_path, {"queries": self.queries})

    # ---------- documents ----------

    def save_document(self, document: dict) -> None:
        self.documents[document["id"]] = document
        self._flush_documents()

    def get_document(self, document_id: str) -> Optional[dict]:
        return self.documents.get(document_id)

    def list_documents(self) -> List[dict]:
        return sorted(
            self.documents.values(),
            key=lambda d: d.get("uploaded_at", ""),
            reverse=True,
        )

    def delete_document(self, document_id: str) -> None:
        self.documents.pop(document_id, None)
        chunk_ids_to_remove = [cid for cid, c in self.chunks.items() if c["document_id"] == document_id]
        for cid in chunk_ids_to_remove:
            self.chunks.pop(cid, None)
        self._flush_documents()

    # ---------- chunks ----------

    def save_chunks(self, chunks: List[dict]) -> None:
        for chunk in chunks:
            self.chunks[chunk["id"]] = chunk
        self._flush_documents()

    def get_chunk(self, chunk_id: str) -> Optional[dict]:
        return self.chunks.get(chunk_id)

    def list_chunks_for_document(self, document_id: str) -> List[dict]:
        return [c for c in self.chunks.values() if c["document_id"] == document_id]

    def all_chunks_in_order(self) -> List[dict]:
        """Returns all chunks ordered by their stored vector_row index."""
        return sorted(self.chunks.values(), key=lambda c: c["vector_row"])

    # ---------- users ----------

    def save_user(self, user: dict) -> None:
        self.users[user["id"]] = user
        self._flush_users()

    def get_user_by_email(self, email: str) -> Optional[dict]:
        email_lower = email.lower()
        for user in self.users.values():
            if user["email"].lower() == email_lower:
                return user
        return None

    def get_user(self, user_id: str) -> Optional[dict]:
        return self.users.get(user_id)

    def list_users(self) -> List[dict]:
        return sorted(self.users.values(), key=lambda u: u.get("created_at", ""))

    # ---------- query log (for analytics) ----------

    def log_query(self, entry: dict) -> None:
        self.queries.append(entry)
        # Keep the log bounded so it doesn't grow unbounded on disk.
        if len(self.queries) > 5000:
            self.queries = self.queries[-5000:]
        self._flush_queries()


# Singleton instance used across the app.
metadata_store = MetadataStore()
