"""
LLM integration service.

Calls the Anthropic Messages API when ANTHROPIC_API_KEY is configured in the
environment (see .env.example). The key is never hardcoded anywhere in this
codebase -- it is read from the environment at request time via
app.core.config.settings, and is never logged or returned to the frontend.

If no key is configured, `generate()` returns None and the caller
(rag_service.py) falls back to a clearly-labeled extractive "demo mode"
answer built directly from retrieved evidence, instead of pretending a
template response is real LLM generation.
"""
from typing import List, Optional

import httpx

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"


def is_configured() -> bool:
    return bool(settings.ANTHROPIC_API_KEY)


def generate(system_prompt: str, user_prompt: str) -> Optional[str]:
    """
    Calls the Anthropic API. Returns the generated text, or None if no API
    key is configured or the call fails (errors are logged, never leaked to
    the frontend as raw exception text -- see api/routes/chat.py).
    """
    if not is_configured():
        return None

    try:
        response = httpx.post(
            ANTHROPIC_API_URL,
            headers={
                "x-api-key": settings.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": settings.ANTHROPIC_MODEL,
                "max_tokens": settings.LLM_MAX_TOKENS,
                "system": system_prompt,
                "messages": [{"role": "user", "content": user_prompt}],
            },
            timeout=30.0,
        )
        response.raise_for_status()
        data = response.json()
        text_blocks = [block["text"] for block in data.get("content", []) if block.get("type") == "text"]
        return "\n".join(text_blocks).strip() or None
    except httpx.HTTPStatusError as exc:
        logger.error("Anthropic API returned an error status: %s", exc.response.status_code)
        return None
    except Exception as exc:
        logger.error("Anthropic API call failed: %s", exc)
        return None
