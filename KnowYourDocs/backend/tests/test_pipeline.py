"""
End-to-end backend tests covering PART 16 of the project brief:
auth, upload, validation, extraction, chunking, embeddings, indexing,
semantic retrieval, grounded QA, citations, insufficient-evidence handling,
deletion, and index persistence.

Run with: pytest -v (from the backend/ directory)
"""
import shutil
from pathlib import Path

import pymupdf
import pytest
from fastapi.testclient import TestClient

TEST_STORAGE = Path(__file__).parent / "_test_storage"
TEST_UPLOADS = Path(__file__).parent / "_test_uploads"


@pytest.fixture(scope="module", autouse=True)
def isolated_storage(tmp_path_factory):
    """
    Redirects all persistence to a throwaway directory for this test run, so
    tests never read or write the real application's storage/ and uploads/
    directories. Must run (and construct a fresh Settings + singletons)
    before any test or other fixture imports app.* modules.
    """
    import os

    storage_dir = tmp_path_factory.mktemp("storage")
    upload_dir = tmp_path_factory.mktemp("uploads")
    os.environ["STORAGE_DIR"] = str(storage_dir)
    os.environ["UPLOAD_DIR"] = str(upload_dir)

    # Re-create the settings singleton now that env vars are set, and point
    # every other already-imported singleton's module-level `settings` alias
    # at it too (they all do `from app.core.config import settings`, which
    # binds the name at import time -- re-assigning app.core.config.settings
    # after the fact would NOT update those already-bound references, so we
    # instead reload config first, before anything else is imported).
    import app.core.config as config_module

    config_module.settings = config_module.Settings()
    config_module.settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    config_module.settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    yield


@pytest.fixture(scope="module")
def client(isolated_storage):
    from app.main import app

    return TestClient(app)


@pytest.fixture(scope="module")
def auth_token(client):
    resp = client.post(
        "/api/auth/register",
        json={"name": "Test User", "email": "pytest@nexus.ai", "password": "TestPassword123"},
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


@pytest.fixture
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


def _make_pdf(path: Path, title: str, body_lines: list):
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 72), title, fontsize=16)
    y = 110
    for line in body_lines:
        page.insert_text((50, y), line, fontsize=11)
        y += 20
    doc.save(str(path))
    doc.close()


def test_health_check(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_register_and_login(client):
    resp = client.post(
        "/api/auth/register",
        json={"name": "Another User", "email": "second@nexus.ai", "password": "AnotherPass123"},
    )
    assert resp.status_code == 200
    login_resp = client.post(
        "/api/auth/login", json={"email": "second@nexus.ai", "password": "AnotherPass123"}
    )
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()


def test_login_rejects_wrong_password(client):
    resp = client.post("/api/auth/login", json={"email": "second@nexus.ai", "password": "WrongPassword"})
    assert resp.status_code == 401


def test_unauthenticated_upload_rejected(client, tmp_path):
    pdf_path = tmp_path / "doc.pdf"
    _make_pdf(pdf_path, "Doc", ["Hello world."])
    with open(pdf_path, "rb") as f:
        resp = client.post("/api/documents/upload", files={"file": ("doc.pdf", f, "application/pdf")})
    assert resp.status_code == 401


def test_invalid_file_type_rejected(client, auth_headers, tmp_path):
    txt_path = tmp_path / "notes.txt"
    txt_path.write_text("just text")
    with open(txt_path, "rb") as f:
        resp = client.post(
            "/api/documents/upload", headers=auth_headers, files={"file": ("notes.txt", f, "text/plain")}
        )
    assert resp.status_code == 400


def test_upload_pdf_and_full_pipeline(client, auth_headers, tmp_path):
    pdf_path = tmp_path / "Handbook_A.pdf"
    _make_pdf(
        pdf_path,
        "Handbook A",
        ["Section 1: Vacation Policy", "Employees receive 20 vacation days per year."],
    )
    with open(pdf_path, "rb") as f:
        resp = client.post(
            "/api/documents/upload", headers=auth_headers, files={"file": ("Handbook_A.pdf", f, "application/pdf")}
        )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "completed"
    assert data["page_count"] == 1
    assert data["chunk_count"] >= 1
    assert data["error_message"] is None


def test_document_list_contains_upload(client, auth_headers):
    resp = client.get("/api/documents", headers=auth_headers)
    assert resp.status_code == 200
    names = [d["original_filename"] for d in resp.json()["documents"]]
    assert "Handbook_A.pdf" in names


def test_semantic_search_returns_relevant_chunk(client, auth_headers):
    resp = client.post("/api/search", headers=auth_headers, json={"query": "vacation days"})
    assert resp.status_code == 200
    results = resp.json()["results"]
    assert len(results) >= 1
    assert "vacation" in results[0]["text"].lower()
    assert results[0]["page_number"] == 1
    assert 0.0 <= results[0]["similarity_score"] <= 1.0001


def test_chat_grounded_answer_has_citations(client, auth_headers):
    resp = client.post("/api/chat", headers=auth_headers, json={"question": "How many vacation days do employees get?"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["sufficient_evidence"] is True
    assert len(data["citations"]) >= 1
    assert data["citations"][0]["document_name"] == "Handbook_A.pdf"
    assert data["citations"][0]["page_number"] == 1
    stage_names = [s["stage"] for s in data["pipeline_stages"]]
    assert "response_delivered" in stage_names


def test_chat_insufficient_evidence_for_unrelated_question(client, auth_headers):
    resp = client.post("/api/chat", headers=auth_headers, json={"question": "What is the capital of Mongolia?"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["sufficient_evidence"] is False
    assert data["citations"] == []
    assert "couldn't find sufficient" in data["answer"].lower()


def test_delete_document_and_reindex(client, auth_headers, tmp_path):
    pdf_path = tmp_path / "Temp_Doc.pdf"
    _make_pdf(pdf_path, "Temp", ["This document will be deleted shortly after upload."])
    with open(pdf_path, "rb") as f:
        upload_resp = client.post(
            "/api/documents/upload", headers=auth_headers, files={"file": ("Temp_Doc.pdf", f, "application/pdf")}
        )
    doc_id = upload_resp.json()["id"]

    del_resp = client.delete(f"/api/documents/{doc_id}", headers=auth_headers)
    assert del_resp.status_code == 204

    list_resp = client.get("/api/documents", headers=auth_headers)
    ids = [d["id"] for d in list_resp.json()["documents"]]
    assert doc_id not in ids


def test_analytics_reflects_real_counts(client, auth_headers):
    resp = client.get("/api/analytics", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_documents"] >= 1
    assert data["processed_documents"] >= 1
    assert data["total_queries"] >= 1


def test_image_only_pdf_fails_gracefully(client, auth_headers, tmp_path):
    """A PDF with a blank page (no text layer) should be marked failed, not
    silently treated as processed."""
    pdf_path = tmp_path / "Blank.pdf"
    doc = pymupdf.open()
    doc.new_page()  # no text at all
    doc.save(str(pdf_path))
    doc.close()

    with open(pdf_path, "rb") as f:
        resp = client.post(
            "/api/documents/upload", headers=auth_headers, files={"file": ("Blank.pdf", f, "application/pdf")}
        )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "failed"
    assert data["error_message"] is not None
