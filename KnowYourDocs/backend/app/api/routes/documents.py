import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.logging import get_logger
from app.core.security import sanitize_filename
from app.schemas.schemas import DocumentListResponse, DocumentStatus
from app.services import indexing_service
from app.services.document_processor import TextExtractionError, chunk_pages, extract_pages
from app.services.metadata_store import metadata_store

router = APIRouter(prefix="/api/documents", tags=["documents"])
logger = get_logger(__name__)


def _to_status(doc: dict) -> DocumentStatus:
    return DocumentStatus(**doc)


@router.get("", response_model=DocumentListResponse)
def list_documents(current_user: dict = Depends(get_current_user)):
    docs = [_to_status(d) for d in metadata_store.list_documents()]
    return DocumentListResponse(documents=docs, total=len(docs))


@router.post("/upload", response_model=DocumentStatus, status_code=status.HTTP_201_CREATED)
async def upload_document(file: UploadFile, current_user: dict = Depends(get_current_user)):
    original_filename = file.filename or "untitled.pdf"
    safe_name = sanitize_filename(original_filename)

    if not safe_name.lower().endswith(settings.ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed types: {', '.join(settings.ALLOWED_EXTENSIONS)}",
        )

    file_bytes = await file.read()
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {settings.MAX_FILE_SIZE_MB}MB limit.",
        )
    if len(file_bytes) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    document_id = str(uuid.uuid4())
    stored_filename = f"{document_id}_{safe_name}"
    stored_path = settings.UPLOAD_DIR / stored_filename

    # Never trust the client filename as a path -- stored_filename is derived
    # from a fresh uuid plus a sanitized basename, and always written inside
    # UPLOAD_DIR.
    with open(stored_path, "wb") as f:
        f.write(file_bytes)

    document = {
        "id": document_id,
        "filename": stored_filename,
        "original_filename": safe_name,
        "status": "processing",
        "error_message": None,
        "page_count": 0,
        "chunk_count": 0,
        "size_bytes": len(file_bytes),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "processed_at": None,
    }
    metadata_store.save_document(document)

    try:
        pages = extract_pages(file_bytes)
        chunks = chunk_pages(document_id, pages)
        if not chunks:
            raise TextExtractionError("No text chunks could be produced from this document.")

        chunk_dicts = [
            {
                "id": c.id,
                "document_id": c.document_id,
                "page_number": c.page_number,
                "chunk_index": c.chunk_index,
                "text": c.text,
                "vector_row": -1,  # assigned during reindex
            }
            for c in chunks
        ]
        indexing_service.index_new_chunks(chunk_dicts)

        document.update(
            {
                "status": "completed",
                "page_count": len(pages),
                "chunk_count": len(chunks),
                "processed_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        metadata_store.save_document(document)
        logger.info("Processed document %s: %d pages, %d chunks.", safe_name, len(pages), len(chunks))

    except TextExtractionError as exc:
        document.update({"status": "failed", "error_message": str(exc)})
        metadata_store.save_document(document)
        logger.warning("Document processing failed for %s: %s", safe_name, exc)
    except Exception as exc:
        # Never leak raw internal exception details to the client.
        document.update({"status": "failed", "error_message": "An internal error occurred while processing this document."})
        metadata_store.save_document(document)
        logger.error("Unexpected error processing %s: %s", safe_name, exc)

    return _to_status(document)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: str, current_user: dict = Depends(get_current_user)):
    document = metadata_store.get_document(document_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    file_path = settings.UPLOAD_DIR / document["filename"]
    if file_path.exists():
        file_path.unlink()

    metadata_store.delete_document(document_id)
    indexing_service.reindex_all()
    logger.info("Deleted document %s and reindexed remaining corpus.", document_id)


@router.get("/{document_id}/download")
def download_document(document_id: str, current_user: dict = Depends(get_current_user)):
    document = metadata_store.get_document(document_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    file_path = settings.UPLOAD_DIR / document["filename"]
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File is missing from storage.")

    return FileResponse(path=file_path, filename=document["original_filename"], media_type="application/pdf")
