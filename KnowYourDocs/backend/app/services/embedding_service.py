"""
Embedding generation service.

Design note on the embedding backend actually used in this MVP
------------------------------------------------------------------
The project brief's preferred model is `sentence-transformers/all-MiniLM-L6-v2`.
That model's weights are hosted on huggingface.co, and this sandboxed
development environment only has outbound network access to a small
allow-list of domains (pypi.org, npmjs.org, api.anthropic.com, github.com,
etc.) -- huggingface.co is not reachable here, confirmed via a direct
connectivity check before writing this service. Attempting to load the
pretrained model would hang or fail with a DNS error, not silently degrade,
so shipping it as the default would break the app out of the box.

Instead, EMBEDDING_BACKEND defaults to "tfidf-svd": a TF-IDF vectorizer
followed by truncated SVD (a compact, well-understood technique sometimes
called "Latent Semantic Analysis") that produces real, corpus-derived dense
embeddings with no external downloads. It is a genuine semantic-ish
embedding (it captures term co-occurrence structure, not just exact keyword
overlap) but it is weaker than a pretrained transformer, especially across
paraphrases that share no vocabulary.

Both backends implement the same `EmbeddingService` interface
(fit / embed_texts / embed_query / dim), so switching to real
sentence-transformers in an environment with full internet access is a
one-line config change (EMBEDDING_BACKEND=sentence-transformers in .env) and
requires no changes anywhere else in the codebase.
"""
from __future__ import annotations

import threading
from typing import List, Optional

import joblib
import numpy as np
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import normalize

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class EmbeddingService:
    """Fits on the full corpus and embeds text into unit-norm vectors
    (so that inner-product similarity == cosine similarity)."""

    def __init__(self):
        self.backend = settings.EMBEDDING_BACKEND
        self.dim = settings.EMBEDDING_DIM
        self._lock = threading.Lock()
        self._fitted = False

        if self.backend == "sentence-transformers":
            self._init_sentence_transformer()
        else:
            self._vectorizer: Optional[TfidfVectorizer] = None
            self._svd: Optional[TruncatedSVD] = None
            self._try_load_from_disk()

    # ---------- sentence-transformers backend (requires internet access) ----------

    def _init_sentence_transformer(self):
        try:
            from sentence_transformers import SentenceTransformer  # noqa: F401
            self._st_model = SentenceTransformer(settings.SENTENCE_TRANSFORMER_MODEL)
            self.dim = self._st_model.get_sentence_embedding_dimension()
            self._fitted = True
            logger.info("Loaded sentence-transformers model %s", settings.SENTENCE_TRANSFORMER_MODEL)
        except Exception as exc:
            logger.error(
                "Failed to load sentence-transformers model (%s). Falling back "
                "to tfidf-svd backend. Set EMBEDDING_BACKEND=tfidf-svd in .env "
                "to silence this warning.",
                exc,
            )
            self.backend = "tfidf-svd"
            self._vectorizer = None
            self._svd = None
            self._try_load_from_disk()

    # ---------- persistence (tfidf-svd backend) ----------

    def _try_load_from_disk(self):
        if settings.VECTORIZER_PATH.exists():
            try:
                data = joblib.load(settings.VECTORIZER_PATH)
                self._vectorizer = data["vectorizer"]
                self._svd = data["svd"]
                self.dim = self._svd.n_components
                self._fitted = True
                logger.info("Loaded persisted tfidf-svd embedding model from disk.")
            except Exception as exc:
                logger.warning("Could not load persisted embedding model: %s", exc)

    def _persist(self):
        joblib.dump({"vectorizer": self._vectorizer, "svd": self._svd}, settings.VECTORIZER_PATH)

    # ---------- public API ----------

    @property
    def is_fitted(self) -> bool:
        return self._fitted

    def fit(self, corpus_texts: List[str]) -> None:
        """
        (Re)fits the embedding space on the full corpus of chunk texts.
        Required for the tfidf-svd backend whenever the document set changes,
        since TF-IDF vocabulary and SVD components are corpus-dependent.
        No-op for the sentence-transformers backend (pretrained, no fitting).
        """
        if self.backend == "sentence-transformers":
            return

        with self._lock:
            if len(corpus_texts) < 2:
                # SVD needs at least n_components < n_samples; fall back to a
                # tiny component count for very small corpora so the app
                # still works end-to-end on a single uploaded document.
                n_components = 1
            else:
                n_components = min(self.dim, max(2, len(corpus_texts) - 1), 384)

            vectorizer = TfidfVectorizer(
                max_features=20000,
                stop_words="english",
                ngram_range=(1, 2),
                sublinear_tf=True,
            )
            tfidf_matrix = vectorizer.fit_transform(corpus_texts)

            svd = TruncatedSVD(n_components=n_components, random_state=42)
            svd.fit(tfidf_matrix)

            self._vectorizer = vectorizer
            self._svd = svd
            self.dim = n_components
            self._fitted = True
            self._persist()
            logger.info(
                "Fitted tfidf-svd embedding space on %d chunks (dim=%d).",
                len(corpus_texts),
                n_components,
            )

    def embed_texts(self, texts: List[str]) -> np.ndarray:
        """Embeds a batch of texts into unit-norm vectors, shape (n, dim)."""
        if self.backend == "sentence-transformers":
            vectors = self._st_model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
            return vectors.astype("float32")

        if not self._fitted:
            raise RuntimeError("Embedding model has not been fitted yet.")

        tfidf_matrix = self._vectorizer.transform(texts)
        dense = self._svd.transform(tfidf_matrix)
        dense = normalize(dense, norm="l2", axis=1)
        return dense.astype("float32")

    def embed_query(self, text: str) -> np.ndarray:
        return self.embed_texts([text])[0]


# Singleton instance used across the app.
embedding_service = EmbeddingService()
