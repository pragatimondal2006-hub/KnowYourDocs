from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.logging import get_logger
from app.schemas.schemas import ChatRequest, ChatResponse
from app.services.metadata_store import metadata_store
from app.services.rag_service import answer_question

router = APIRouter(prefix="/api/chat", tags=["chat"])
logger = get_logger(__name__)


@router.post("", response_model=ChatResponse)
def chat(payload: ChatRequest, current_user: dict = Depends(get_current_user)):
    result = answer_question(payload.question, document_ids=payload.document_ids)

    metadata_store.log_query(
        {
            "user_id": current_user["id"],
            "question": payload.question,
            "generation_mode": result["generation_mode"],
            "sufficient_evidence": result["sufficient_evidence"],
            "took_ms": result["took_ms"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )

    return ChatResponse(**result)
