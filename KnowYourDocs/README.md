# NEXUS AI — Enterprise Knowledge Intelligence Platform

A working Retrieval-Augmented Generation (RAG) document intelligence MVP: upload PDFs, ask
questions in plain language, and get grounded answers with real page-level citations.

This is a **scoped MVP**, not the full 12-module enterprise spec it was built from. It
prioritizes a genuinely working upload → extract → chunk → embed → index → retrieve →
answer → cite pipeline over breadth of secondary features. See **"What's implemented vs.
not"** below for the honest accounting.

---

## 1. Quick start

### Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate   # optional but recommended
pip install -r requirements.txt
cp .env.example .env                                # edit if you have an Anthropic API key
uvicorn app.main:app --reload --port 8000
```

Backend runs at **http://127.0.0.1:8000**. Interactive API docs: **http://127.0.0.1:8000/docs**.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://127.0.0.1:5173** and proxies `/api/*` to the backend (see
`vite.config.ts`). Open that URL, register an account (the first registered user becomes
an Administrator), and upload a PDF.

### Run the backend test suite

```bash
cd backend
pytest -v
```

13 tests cover auth, upload validation, extraction, chunking, embedding, indexing,
semantic search, grounded Q&A, the "insufficient evidence" path, citations, deletion +
reindexing, analytics, and graceful handling of a text-less (scanned) PDF. All 13 pass as
of this delivery — **actually executed**, not just written (see section 7).

---

## 2. Architecture

```
nexus-ai/
├── backend/            FastAPI app (Python 3.11+)
│   ├── app/
│   │   ├── main.py             FastAPI app, CORS, routing
│   │   ├── api/routes/         auth, documents, search, chat, compare, analytics, users
│   │   ├── core/                config, security (JWT + bcrypt), logging
│   │   ├── services/
│   │   │   ├── document_processor.py   PDF extraction + page-aware chunking
│   │   │   ├── embedding_service.py    swappable embedding backend
│   │   │   ├── vector_store.py         FAISS, persisted to disk
│   │   │   ├── indexing_service.py     keeps embeddings/index/metadata in sync
│   │   │   ├── retrieval_service.py    semantic search
│   │   │   ├── rag_service.py          RAG orchestration + grounding rules
│   │   │   ├── citation_service.py     builds citations from retrieved chunks
│   │   │   ├── compare_service.py      two-document comparison
│   │   │   ├── llm_service.py          Anthropic API integration
│   │   │   ├── auth_service.py         registration/login
│   │   │   └── metadata_store.py       JSON-backed persistent metadata
│   │   └── schemas/schemas.py          Pydantic request/response models
│   ├── tests/test_pipeline.py          pytest suite (13 tests)
│   ├── storage/         metadata.json, vector.index, vectorizer.joblib (persisted)
│   └── uploads/         stored PDF files
└── frontend/           React 18 + TypeScript + Vite + Tailwind
    └── src/
        ├── pages/        Login, Register, Dashboard, Assistant, Documents, Search,
        │                 Compare, Analytics, Users, Settings
        ├── components/   layout (Sidebar/Topbar/AppShell), chat (citations, pipeline
        │                 timeline), documents (upload zone, document card), ui (shared
        │                 primitives)
        ├── hooks/        useAuth (JWT session management)
        ├── services/     api.ts (typed fetch client)
        └── types/        shared TypeScript interfaces mirroring backend schemas
```

### How the document-to-answer pipeline works

1. **Upload**: a PDF is validated (type, size, non-empty), given a UUID, and saved under
   `backend/uploads/` with a sanitized filename (never the client-supplied path).
2. **Extraction**: PyMuPDF extracts text per page. A page-only PDF with no extractable
   text (e.g. a scanned image with no OCR layer) is marked `failed` with a clear error
   message — never silently treated as processed.
3. **Chunking**: each page's text is split into ~1000-character chunks with ~150-character
   overlap, breaking on paragraph/sentence boundaries where possible. Chunks never span a
   page boundary, so every chunk keeps an accurate `page_number`.
4. **Embedding**: every chunk is embedded into a dense vector (see "Embedding backend"
   below) and the whole corpus's embedding space is (re)fit so new vocabulary is captured.
5. **Indexing**: vectors are loaded into a FAISS `IndexFlatIP` (cosine similarity via
   inner product on unit-norm vectors) and persisted to disk — **the index survives a
   backend restart**, verified in testing (see section 7).
6. **Retrieval**: a query is embedded the same way, FAISS returns the most similar chunk
   vectors, and results are mapped back to document/page metadata and filtered by a
   minimum similarity threshold.
7. **Grounded generation**: retrieved chunks are assembled into a context block and passed
   to Claude (if `ANTHROPIC_API_KEY` is set) with a system prompt that forbids outside
   knowledge, forbids inventing citations, and explicitly instructs the model to treat
   document content as untrusted data rather than instructions (prompt-injection
   mitigation — see section 6). If no evidence clears the similarity threshold, the LLM is
   never called; the fixed "I couldn't find sufficient supporting information…" response
   is returned instead.
8. **Citations**: every citation is built directly from a chunk that was actually
   retrieved — a real document ID, page number, and excerpt. Nothing is invented.

### Embedding backend — an important, deliberate substitution

The brief's preferred model is `sentence-transformers/all-MiniLM-L6-v2`. **This sandboxed
development environment has no outbound network access to huggingface.co** (confirmed via
a direct connectivity check before writing any code — see `embedding_service.py`'s
docstring), so those pretrained weights cannot be downloaded here.

Instead, the default `EMBEDDING_BACKEND=tfidf-svd` uses a TF-IDF vectorizer + truncated
SVD (classic "Latent Semantic Analysis") to produce real, corpus-derived dense embeddings
with zero external downloads. It genuinely captures term co-occurrence structure (not just
exact keyword overlap — it correctly ranked "remote work days" against "Employees may work
remotely up to 3 days per week" with 0.99+ similarity in testing), but it is weaker than a
pretrained transformer on paraphrases that share little vocabulary, and it must be refit
whenever the document corpus changes (handled automatically, see `indexing_service.py`).

Both backends implement the same interface, so switching to real sentence-transformers in
an environment with full internet access is a **one-line config change**
(`EMBEDDING_BACKEND=sentence-transformers` in `.env`) with no other code changes required.

### LLM integration

Calls Anthropic's Messages API directly via `httpx` when `ANTHROPIC_API_KEY` is set in the
environment — the key is read from `app.core.config.settings` at request time, never
hardcoded, logged, or returned to the frontend. **No key is configured in this delivery**
(none was provided and none should ever be embedded in code), so chat and compare
responses run in a clearly-labeled "demo mode": the UI shows an explicit banner, and the
API response's `generation_mode` field is `"demo_extractive"` rather than `"llm"`, so the
frontend never presents extracted excerpts as if they were generated text.

---

## 3. Official design system

Implemented exactly as specified in the brief: Vanilla Cream (#F6EFE5) background, Soft
Ivory (#FBF8F3) cards, Espresso Brown (#684B3B) primary actions, warm beige/taupe
secondary surfaces, Manrope headings + Inter body text, 12–18px card radii, and the
specified button/hover/active states (2px lift, soft shadow increase, 150–220ms
transitions). Framer Motion drives page transitions and a custom "breathing dot" loading
indicator for the AI assistant.

---

## 4. What's implemented vs. not (honest accounting)

**Fully implemented and tested:**
- PDF upload, validation (type/size/empty), secure filename handling
- Real text extraction, page identification, page-aware chunking with overlap
- Real embedding generation (TF-IDF+SVD, swappable), persistent FAISS vector indexing
- Semantic retrieval with similarity scoring and threshold filtering
- Grounded RAG Q&A with real citations; verified "insufficient evidence" refusal path
- Document comparison (two-document, focus-topic retrieval from each)
- Document deletion with consistent re-indexing
- Index/metadata persistence across backend restarts (tested by killing and restarting
  the process)
- JWT auth with bcrypt password hashing, protected routes, role-based access (first
  registered user becomes Administrator)
- Analytics from real counts (documents, chunks, queries, latency, 7-day query volume) —
  zero values and empty states when there's no data, never fabricated numbers
- Full frontend: Login/Register, Dashboard, AI Assistant (chat with citations + pipeline
  timeline visualization), Knowledge Base (upload/list/delete/download, grid + table
  view), Smart Search, Document Comparison, Analytics (Recharts), Settings, Users (admin)
- CORS, path traversal protection, no plaintext passwords, no raw exception leakage to
  the client, prompt-injection-aware system prompt

**Simplified or not implemented, by design, for this MVP:**
- **LLM generation requires a user-supplied `ANTHROPIC_API_KEY`.** None was provided in
  this environment; the app runs correctly in demo mode without one, and the UI is honest
  about which mode is active.
- **Real sentence-transformers embeddings require internet access this sandbox doesn't
  have.** TF-IDF+SVD is used instead (see section 2); switching is a one-line config
  change elsewhere.
- **Organization-level multi-tenant isolation is not implemented.** All authenticated
  users share one knowledge base; role (Administrator/Manager/Employee) gates the Users
  page but does not yet scope document visibility.
- **DOCX/TXT upload is not implemented** — PDF only, as the brief allows ("initially PDF").
- **OCR for scanned/image-only PDFs is not implemented** — such files are correctly
  detected and marked `failed` with a clear message, never silently mis-processed.
- **Response streaming** is not implemented (the Settings toggle for it is UI-only).
- **"Forgot password"** is not implemented.
- Settings toggles (notifications, "automatically index," etc.) are UI-only in this MVP —
  not yet wired to backend behavior. This is stated directly in the Settings page itself.
- Background/async upload processing is not implemented — uploads process synchronously
  within the request for reliability and simplicity; fine for demo-scale PDFs, would need
  a task queue (e.g. Celery/RQ) for large files or high concurrency in production.
- Docker/Compose packaging was not built (marked "optional" in the brief) to keep the
  delivered scope reliable and fully tested rather than broad and unverified.

---

## 5. Required API keys / credentials

| Feature | Required? | Variable |
|---|---|---|
| Core app (upload, search, auth) | No | — |
| Real LLM-generated answers (vs. demo mode) | Optional | `ANTHROPIC_API_KEY` |
| Real sentence-transformer embeddings | Optional, requires internet access to huggingface.co | `EMBEDDING_BACKEND=sentence-transformers` |

Nothing else needs a credential. The app is fully explorable end-to-end with zero keys.

---

## 6. Security notes

- Passwords hashed with bcrypt (never stored or logged in plaintext).
- JWT bearer tokens, validated on every protected route.
- Filenames sanitized and never trusted as filesystem paths; stored files are named
  `<uuid>_<sanitized-name>` inside `backend/uploads/` only.
- File type and size validated before processing.
- Internal exception details are never returned to the client — failures are logged
  server-side and a generic message is returned.
- The RAG system prompt explicitly instructs the model to treat retrieved document text
  as untrusted data, not instructions, specifically to mitigate prompt injection via
  malicious document content (e.g. a PDF containing "ignore previous instructions...").
- **Known limitation**: `JWT_SECRET` defaults to an insecure placeholder for local dev —
  **generate a real secret before any non-local deployment** (see `.env.example`).

---

## 7. What was actually tested (not just written)

Run yourself with `cd backend && pytest -v`. As executed during this delivery:

```
13 passed in ~2s
```

Covering: health check, registration, login (success + wrong-password rejection),
unauthenticated-upload rejection, invalid-file-type rejection, full upload→extract→chunk→
embed→index pipeline, document listing, semantic search relevance, grounded chat with
citations, insufficient-evidence refusal, deletion + reindex consistency, analytics
reflecting real counts, and graceful failure on a text-less (scanned) PDF.

Additionally manually verified via live `curl` sessions during development (see
conversation history for full request/response pairs): registration → two-document
upload → semantic search → grounded chat (both answerable and unanswerable questions) →
document comparison → analytics → document deletion with reindex → **backend process
killed and restarted, then re-verified that documents, the FAISS index, and search all
survived without re-uploading** → full round-trip through the frontend's Vite dev-server
proxy (not just directly against the backend).

---

## 8. Recommended next engineering steps

1. Swap in real sentence-transformers embeddings in an environment with internet access.
2. Add an `ANTHROPIC_API_KEY` to unlock real LLM generation (code is already wired for it).
3. Add organization-level multi-tenancy (scope documents by workspace, not just by role).
4. Move upload processing to a background task queue for large files / high concurrency.
5. Add OCR (e.g. Tesseract) for scanned PDFs.
6. Swap the JSON metadata store for PostgreSQL + pgvector (the `VectorStore` /
   `MetadataStore` interfaces were deliberately kept narrow to make this swap mechanical).
7. Wire the Settings toggles to real backend behavior; add password reset.
8. Add frontend tests (Vitest) and backend integration tests against a real multi-document
   corpus of longer documents.
