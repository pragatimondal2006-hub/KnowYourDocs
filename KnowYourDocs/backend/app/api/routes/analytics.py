from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.schemas.schemas import AnalyticsResponse, DocumentStatus
from app.services.metadata_store import metadata_store

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("", response_model=AnalyticsResponse)
def get_analytics(current_user: dict = Depends(get_current_user)):
    documents = metadata_store.list_documents()
    processed = [d for d in documents if d["status"] == "completed"]
    failed = [d for d in documents if d["status"] == "failed"]
    processing = [d for d in documents if d["status"] == "processing"]
    total_chunks = sum(d.get("chunk_count", 0) for d in documents)

    queries = metadata_store.queries
    latencies = [q["took_ms"] for q in queries if "took_ms" in q]
    avg_latency = round(sum(latencies) / len(latencies), 1) if latencies else None

    # Queries per day for the last 7 days -- real counts, zero when empty.
    today = datetime.now(timezone.utc).date()
    day_counts = defaultdict(int)
    for q in queries:
        try:
            q_date = datetime.fromisoformat(q["timestamp"]).date()
        except (KeyError, ValueError):
            continue
        day_counts[q_date] += 1

    last_7_days = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        last_7_days.append({"date": day.isoformat(), "queries": day_counts.get(day, 0)})

    return AnalyticsResponse(
        total_documents=len(documents),
        processed_documents=len(processed),
        failed_documents=len(failed),
        processing_documents=len(processing),
        total_chunks=total_chunks,
        total_queries=len(queries),
        average_latency_ms=avg_latency,
        recent_uploads=[DocumentStatus(**d) for d in documents[:5]],
        queries_last_7_days=last_7_days,
    )
