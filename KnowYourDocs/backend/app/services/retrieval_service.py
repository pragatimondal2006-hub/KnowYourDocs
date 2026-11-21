"""
Semantic retrieval service (MODULE 4 of the project brief).

Given a natural-language query, this module:
  1. Generates its embedding.
  2. Searches the FAISS index for the most similar chunk vectors.
  3. Maps vector rows back to chunk + document metadata.
  4. Applies similarity-score and document-id filtering.
  5. Returns ranked, metadata-rich results -- never a bare similarity score
     with no provenance.
"""
from dataclasses import dataclass
from typing import List, Optional

from app.core.config import settings
from app.services.embedding_service import embedding_service
from app.services.metadata_store import metadata_store
from app.services.vector_store import vector_store


@dataclass
class RetrievedChunk:
    chunk_id: str
    document_id: str
    document_name: str
    page_number: int
    text: str
    similarity_score: float


def retrieve(
    query: str,
    top_k: Optional[int] = None,
    document_ids: Optional[List[str]] = None,
) -> List[RetrievedChunk]:
    top_k = top_k or settings.TOP_K

    if vector_store.is_empty or not embedding_service.is_fitted:
        return []

    query_vector = embedding_service.embed_query(query)

    # Over-fetch so that post-filtering by document_id / min-score still
    # leaves us with up to `top_k` usable results.
    candidate_count = max(top_k * 5, top_k + 10)
    raw_hits = vector_store.search(query_vector, candidate_count)

    ordered_chunks = metadata_store.all_chunks_in_order()
    results: List[RetrievedChunk] = []

    for vector_row, score in raw_hits:
        if vector_row < 0 or vector_row >= len(ordered_chunks):
            continue
        chunk = ordered_chunks[vector_row]

        if document_ids and chunk["document_id"] not in document_ids:
            continue
        if score < settings.MIN_SIMILARITY_SCORE:
            continue

        document = metadata_store.get_document(chunk["document_id"])
        if not document:
            continue

        results.append(
            RetrievedChunk(
                chunk_id=chunk["id"],
                document_id=chunk["document_id"],
                document_name=document["original_filename"],
                page_number=chunk["page_number"],
                text=chunk["text"],
                similarity_score=round(score, 4),
            )
        )
        if len(results) >= top_k:
            break

    return results
