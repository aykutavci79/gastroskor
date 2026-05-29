from __future__ import annotations

import json
import logging
import re

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"


async def gemini_json_prompt(*, system: str, user: str) -> dict | None:
    if not settings.gemini_api_key:
        return None

    payload = {
        "contents": [{"role": "user", "parts": [{"text": f"{system}\n\n{user}"}]}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }
    params = {"key": settings.gemini_api_key}

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(GEMINI_URL, params=params, json=payload)
            response.raise_for_status()
            data = response.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)
    except Exception as exc:
        logger.warning("Gemini JSON prompt failed: %s", exc)
        return None
