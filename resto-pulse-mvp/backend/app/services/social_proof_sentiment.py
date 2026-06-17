"""Groq ile sorgu genisletme ve toplu sentiment analizi."""

from __future__ import annotations

import json
import logging
import re
import ssl

import httpx

from app.core.config import settings
from app.services.social_proof_matcher import MatchedMention

logger = logging.getLogger(__name__)

GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant"
SENTIMENT_BATCH_SIZE = 20


class SocialProofLlmError(Exception):
    pass


def _httpx_verify():
    try:
        import truststore

        return truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    except Exception:
        return True


def _groq_chat(*, messages: list[dict], temperature: float = 0.2, max_tokens: int = 800) -> str:
    api_key = (settings.groq_api_key or "").strip()
    if not api_key:
        raise SocialProofLlmError("GROQ_API_KEY tanimli degil.")
    model = (settings.social_proof_groq_model or DEFAULT_GROQ_MODEL).strip()
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    timeout = float(settings.social_proof_groq_timeout_sec or 30.0)
    with httpx.Client(timeout=timeout, verify=_httpx_verify()) as client:
        response = client.post(
            GROQ_CHAT_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload,
        )
        response.raise_for_status()
        data = response.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    return str(content or "").strip()


def _parse_json_array(text: str) -> list[str]:
    cleaned = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned)
    if fence:
        cleaned = fence.group(1).strip()
    if cleaned.startswith("["):
        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, list):
                return [str(x).strip() for x in parsed if str(x).strip()]
        except json.JSONDecodeError:
            pass
    # Groq bazen tek satirda virgullu liste doner
    if "," in cleaned and not cleaned.startswith("{"):
        parts = re.findall(r'"([^"]{3,120})"', cleaned)
        if len(parts) >= 2:
            return parts
    lines = [line.strip(" -\t\"'*") for line in cleaned.splitlines() if line.strip()]
    lines = [line for line in lines if len(line) >= 3 and not line.startswith("**")]
    return lines


def expand_search_queries(query: str, *, max_queries: int = 4) -> list[str]:
    base = query.strip()
    if not base:
        return []
    if settings.social_proof_scan_mock:
        return [base]
    try:
        raw = _groq_chat(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Turkce yemek/restoran aramasi icin sorgu genisletici. "
                        "Sadece JSON dizi don: 5-8 kisa arama ifadesi. "
                        "Ornek: [\"en iyi iskender bursa\", \"bursa iskender tavsiye\"]"
                    ),
                },
                {"role": "user", "content": base},
            ],
            temperature=0.3,
            max_tokens=300,
        )
        expanded = _parse_json_array(raw)
    except Exception:
        logger.exception("sorgu genisletme basarisiz, orijinal sorgu kullanilacak")
        expanded = []

    queries = [base]
    for item in expanded:
        if item.lower() != base.lower() and item not in queries:
            queries.append(item)
        if len(queries) >= max_queries:
            break
    return queries[:max_queries]


def _sentiment_batch(texts: list[str]) -> list[dict]:
    numbered = "\n".join(f"{i + 1}. {text[:400]}" for i, text in enumerate(texts))
    raw = _groq_chat(
        messages=[
            {
                "role": "system",
                "content": (
                    "Turkce restoran/yemek mention sentiment analizi. "
                    "Her satir icin JSON dizi don: "
                    '[{"label":"positive|negative|neutral","score":0.0-1.0}]. '
                    "Sadece JSON, baska metin yok."
                ),
            },
            {"role": "user", "content": numbered},
        ],
        temperature=0.0,
        max_tokens=600,
    )
    cleaned = raw.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned)
    if fence:
        cleaned = fence.group(1).strip()
    parsed = json.loads(cleaned)
    if not isinstance(parsed, list):
        raise SocialProofLlmError("Sentiment JSON beklenen formatta degil.")
    return parsed


def analyze_mention_sentiments(mentions: list[MatchedMention]) -> list[tuple[MatchedMention, str, float]]:
    if not mentions:
        return []
    if settings.social_proof_scan_mock:
        return [(mention, "positive", 0.9) for mention in mentions]

    results: list[tuple[MatchedMention, str, float]] = []
    for start in range(0, len(mentions), SENTIMENT_BATCH_SIZE):
        batch = mentions[start : start + SENTIMENT_BATCH_SIZE]
        try:
            sentiments = _sentiment_batch([m.text for m in batch])
        except Exception:
            logger.exception("sentiment batch basarisiz, neutral fallback")
            sentiments = [{"label": "neutral", "score": 0.5} for _ in batch]

        for mention, item in zip(batch, sentiments, strict=False):
            label = str(item.get("label", "neutral")).lower()
            if label not in {"positive", "negative", "neutral"}:
                label = "neutral"
            score = float(item.get("score", 0.5))
            results.append((mention, label, score))
    return results
