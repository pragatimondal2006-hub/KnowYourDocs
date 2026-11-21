from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.schemas.schemas import CompareRequest, CompareResponse
from app.services.compare_service import compare_documents

router = APIRouter(prefix="/api/compare", tags=["compare"])


@router.post("", response_model=CompareResponse)
def compare(payload: CompareRequest, current_user: dict = Depends(get_current_user)):
    try:
        result = compare_documents(payload.document_id_a, payload.document_id_b, payload.focus_question)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return CompareResponse(**result)
