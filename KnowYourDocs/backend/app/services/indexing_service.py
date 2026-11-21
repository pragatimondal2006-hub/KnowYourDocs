"""
Indexing orchestration: keeps the embedding model, FAISS vector store and
chunk metadata consistent with each other. This is the one place that is
allowed to call embedding_service.fit() and vector_store.rebuild(), so there
is a single source of truth for "vector_row N corresponds to chunk X".
"""
from typing import List

from app.core.logging import get_logger
from app.services.embedding_service import embedding_service
from app.services.metadata_store import metadata_store
from app.services.vector_store import vector_store

logger = get_logger(__name__)


def reindex_all() -> None:
    """
    Refits the embedding space on every chunk currently in metadata and
    rebuilds the FAISS index from scratch. Called after any document is
    added or deleted. Assigns a stable `vector_row` to every chunk so
    retrieval results can be mapped back to their source document and page.
    """
    all_chunks = list(metadata_store.chunks.values())
    all_chunks.sort(key=lambda c: (c["document_id"], c["chunk_index"]))

    if not all_chunks:
        vector_store.rebuild(_empty_vectors())
        return

    texts = [c["text"] for c in all_chunks]
    embedding_service.fit(texts)
    vectors = embedding_service.embed_texts(texts)

    for row, chunk in enumerate(all_chunks):
        chunk["vector_row"] = row
    metadata_store.save_chunks(all_chunks)

    vector_store.rebuild(vectors)
    logger.info("Reindexed %d chunks across %d documents.", len(all_chunks), len({c['document_id'] for c in all_chunks}))


def _empty_vectors():
    import numpy as np

    return np.zeros((0, max(embedding_service.dim, 1)), dtype="float32")


def index_new_chunks(chunks: List[dict]) -> None:
    """Persists new chunks then triggers a full reindex (see module docstring
    for why a full rebuild is used instead of incremental indexing)."""
    metadata_store.save_chunks(chunks)
    reindex_all()
