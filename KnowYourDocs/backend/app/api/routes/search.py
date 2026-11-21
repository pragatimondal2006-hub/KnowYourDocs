import time

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.schemas.schemas import SearchRequest, SearchResponse, SearchResultItem
from app.services.retrieval_service import retrieve

router = APIRouter(prefix="/api/search", tags=["search"])


@router.post("", response_model=SearchResponse)
def semantic_search(payload: SearchRequest, current_user: dict = Depends(get_current_user)):
    start = time.perf_counter()
    results = retrieve(payload.query, top_k=payload.top_k, document_ids=payload.document_ids)
    took_ms = round((time.perf_counter() - start) * 1000, 1)

    return SearchResponse(
        query=payload.query,
        results=[
            SearchResultItem(
                chunk_id=r.chunk_id,
                document_id=r.document_id,
                document_name=r.document_name,
                page_number=r.page_number,
                text=r.text,
                similarity_score=r.similarity_score,
            )
            for r in results
        ],
        took_ms=took_ms,
    )
