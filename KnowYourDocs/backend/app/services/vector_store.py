"""
Vector storage service, backed by FAISS with persistent on-disk storage.

Interface is deliberately narrow (rebuild / search / is_empty) so this can be
swapped for PostgreSQL + pgvector later (see PART 14 of the project brief)
without touching the retrieval or RAG services that depend on it.

Because the current embedding backend (tfidf-svd, see embedding_service.py)
must be refit whenever the document corpus changes, this store is rebuilt
from scratch from the full chunk set on every add/delete rather than
incrementally appended to. For the document volumes an MVP demo handles,
a full rebuild (seconds, not minutes) is simpler and safer than
incremental-update bookkeeping, and it eliminates an entire class of
index/metadata drift bugs. Swapping to sentence-transformers (a fixed,
pretrained embedding space) would make incremental `index.add()` safe too.
"""
from __future__ import annotations

import threading
from typing import List, Tuple

import faiss
import numpy as np

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class VectorStore:
    def __init__(self):
        self._lock = threading.Lock()
        self._index: faiss.Index | None = None
        self._dim: int = 0
        self._load_from_disk()

    def _load_from_disk(self):
        if settings.FAISS_INDEX_PATH.exists():
            try:
                self._index = faiss.read_index(str(settings.FAISS_INDEX_PATH))
                self._dim = self._index.d
                logger.info("Loaded persisted FAISS index (%d vectors, dim=%d).", self._index.ntotal, self._dim)
            except Exception as exc:
                logger.warning("Could not load persisted FAISS index: %s", exc)
                self._index = None

    def _persist(self):
        faiss.write_index(self._index, str(settings.FAISS_INDEX_PATH))

    @property
    def is_empty(self) -> bool:
        return self._index is None or self._index.ntotal == 0

    def rebuild(self, vectors: np.ndarray) -> None:
        """
        Replaces the entire index with the given set of unit-norm vectors.
        Row i of `vectors` corresponds to vector_row=i in chunk metadata.
        Uses inner product, which equals cosine similarity for unit-norm
        vectors.
        """
        with self._lock:
            if vectors.shape[0] == 0:
                self._index = None
                if settings.FAISS_INDEX_PATH.exists():
                    settings.FAISS_INDEX_PATH.unlink()
                return

            dim = vectors.shape[1]
            index = faiss.IndexFlatIP(dim)
            index.add(vectors)
            self._index = index
            self._dim = dim
            self._persist()
            logger.info("Rebuilt FAISS index with %d vectors (dim=%d).", index.ntotal, dim)

    def search(self, query_vector: np.ndarray, top_k: int) -> List[Tuple[int, float]]:
        """Returns a list of (vector_row, similarity_score) sorted by score desc."""
        if self.is_empty:
            return []
        query_vector = query_vector.reshape(1, -1).astype("float32")
        scores, indices = self._index.search(query_vector, min(top_k, self._index.ntotal))
        results = []
        for idx, score in zip(indices[0], scores[0]):
            if idx == -1:
                continue
            results.append((int(idx), float(score)))
        return results


# Singleton instance used across the app.
vector_store = VectorStore()
