from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import analytics, auth, chat, compare, documents, search, users
from app.core.config import settings
from app.core.logging import configure_logging, get_logger

configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.services.llm_service import is_configured

    logger.info("%s backend starting up.", settings.APP_NAME)
    logger.info("Embedding backend: %s", settings.EMBEDDING_BACKEND)
    logger.info("LLM configured: %s", is_configured())
    yield
    logger.info("%s backend shutting down.", settings.APP_NAME)


app = FastAPI(
    title=settings.APP_NAME,
    description="Enterprise AI Knowledge Intelligence Platform -- RAG document Q&A API.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.CORS_ORIGINS),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(search.router)
app.include_router(chat.router)
app.include_router(compare.router)
app.include_router(analytics.router)
app.include_router(users.router)


@app.get("/api/health", tags=["health"])
def health_check():
    from app.services.embedding_service import embedding_service
    from app.services.llm_service import is_configured
    from app.services.vector_store import vector_store

    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "embedding_backend": embedding_service.backend,
        "embedding_fitted": embedding_service.is_fitted,
        "vector_index_populated": not vector_store.is_empty,
        "llm_configured": is_configured(),
    }
