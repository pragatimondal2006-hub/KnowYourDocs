"""
Document processing pipeline: text extraction, normalization and page-aware
chunking.

Pipeline (see PART 11, MODULE 3 of the project brief):
    PDF bytes -> per-page text extraction -> normalization -> chunking
    (with overlap) -> list of chunk dicts carrying document_id, page_number,
    chunk index and original text.
"""
import re
import uuid
from dataclasses import dataclass, field
from typing import List

import pymupdf

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class TextExtractionError(Exception):
    """Raised when a PDF cannot be parsed or contains no extractable text."""


@dataclass
class PageText:
    page_number: int  # 1-indexed
    text: str


@dataclass
class Chunk:
    id: str
    document_id: str
    page_number: int
    chunk_index: int
    text: str


def extract_pages(pdf_bytes: bytes) -> List[PageText]:
    """
    Extracts text from every page of a PDF. Raises TextExtractionError if the
    file cannot be opened or no page contains extractable text (e.g. a
    scanned, image-only PDF with no OCR layer) -- we never silently pretend
    such a document was processed.
    """
    try:
        doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    except Exception as exc:
        raise TextExtractionError(f"Could not open PDF: {exc}") from exc

    pages: List[PageText] = []
    try:
        for i, page in enumerate(doc):
            raw_text = page.get_text("text") or ""
            pages.append(PageText(page_number=i + 1, text=_normalize_text(raw_text)))
    finally:
        doc.close()

    non_empty_pages = [p for p in pages if p.text.strip()]
    if not non_empty_pages:
        raise TextExtractionError(
            "No extractable text was found in this PDF. It may be a scanned "
            "or image-only document. OCR is not implemented in this MVP, so "
            "this document cannot be indexed."
        )
    return pages


def _normalize_text(text: str) -> str:
    """Collapses excess whitespace while preserving paragraph breaks."""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def chunk_pages(document_id: str, pages: List[PageText]) -> List[Chunk]:
    """
    Splits each page's text into overlapping chunks of approximately
    CHUNK_SIZE_CHARS characters. Chunking is done per-page so that every
    chunk's page_number metadata is always accurate -- chunks never span a
    page boundary, which keeps citations trustworthy.
    """
    chunk_size = settings.CHUNK_SIZE_CHARS
    overlap = settings.CHUNK_OVERLAP_CHARS
    chunks: List[Chunk] = []
    global_chunk_index = 0

    for page in pages:
        text = page.text
        if not text.strip():
            continue

        start = 0
        text_len = len(text)
        while start < text_len:
            end = min(start + chunk_size, text_len)
            # Try to break on a sentence/paragraph boundary near `end`.
            if end < text_len:
                boundary = text.rfind("\n", start, end)
                if boundary == -1 or boundary <= start + chunk_size // 2:
                    boundary = text.rfind(". ", start, end)
                if boundary != -1 and boundary > start + chunk_size // 2:
                    end = boundary + 1

            chunk_text = text[start:end].strip()
            if chunk_text:
                chunks.append(
                    Chunk(
                        id=str(uuid.uuid4()),
                        document_id=document_id,
                        page_number=page.page_number,
                        chunk_index=global_chunk_index,
                        text=chunk_text,
                    )
                )
                global_chunk_index += 1

            if end >= text_len:
                break
            start = max(end - overlap, start + 1)

    return chunks
