"""
Builds citation objects from retrieved chunks (MODULE 6).

Citations always point at real retrieved content -- a chunk_id, document_id
and page_number that genuinely exist in metadata_store -- never a fabricated
page number or excerpt. This module performs no LLM calls; it is pure
formatting over already-retrieved evidence.
"""
from typing import List

from app.schemas.schemas import Citation
from app.services.retrieval_service import RetrievedChunk


def build_citations(chunks: List[RetrievedChunk]) -> List[Citation]:
    citations = []
    for i, chunk in enumerate(chunks, start=1):
        excerpt = chunk.text.strip()
        if len(excerpt) > 320:
            excerpt = excerpt[:317].rsplit(" ", 1)[0] + "..."
        citations.append(
            Citation(
                citation_ref=f"[{i}]",
                document_id=chunk.document_id,
                document_name=chunk.document_name,
                page_number=chunk.page_number,
                excerpt=excerpt,
                similarity_score=chunk.similarity_score,
            )
        )
    return citations
