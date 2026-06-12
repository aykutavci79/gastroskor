from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Literal

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

GROQ_TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
OPENAI_TRANSCRIBE_URL = "https://api.openai.com/v1/audio/transcriptions"

ProviderName = Literal["groq", "openai"]


class VoiceTranscriptionError(Exception):
    """Ses dosyasi metne cevrilemedi."""


@dataclass(frozen=True)
class VoiceTranscriptionResult:
    text: str
    provider: ProviderName


def _normalize_language(language: str | None) -> str:
    raw = (language or "tr").strip().lower()
    if raw in {"tr", "tr-tr", "turkish"}:
        return "tr"
    return raw[:8] or "tr"


def _transcribe_with_provider(
    *,
    provider: ProviderName,
    url: str,
    api_key: str,
    model: str,
    audio_bytes: bytes,
    filename: str,
    content_type: str,
    language: str,
    timeout_sec: float,
) -> VoiceTranscriptionResult:
    headers = {"Authorization": f"Bearer {api_key}"}
    files = {"file": (filename, audio_bytes, content_type)}
    data = {
        "model": model,
        "language": language,
        "response_format": "json",
        "temperature": "0",
    }

    with httpx.Client(timeout=timeout_sec) as client:
        response = client.post(url, headers=headers, data=data, files=files)
        response.raise_for_status()
        payload = response.json()

    text = str(payload.get("text") or "").strip()
    if not text:
        raise VoiceTranscriptionError(f"{provider} bos metin dondurdu.")
    return VoiceTranscriptionResult(text=text, provider=provider)


def transcribe_voice_audio(
    *,
    audio_bytes: bytes,
    filename: str,
    content_type: str,
    language: str | None = "tr",
) -> VoiceTranscriptionResult:
    """Groq birincil, OpenAI yedek."""
    if not audio_bytes:
        raise VoiceTranscriptionError("Ses dosyasi bos.")

    lang = _normalize_language(language)
    errors: list[str] = []

    groq_key = (settings.groq_api_key or "").strip()
    if groq_key:
        try:
            return _transcribe_with_provider(
                provider="groq",
                url=GROQ_TRANSCRIBE_URL,
                api_key=groq_key,
                model=settings.voice_transcribe_groq_model,
                audio_bytes=audio_bytes,
                filename=filename,
                content_type=content_type,
                language=lang,
                timeout_sec=settings.voice_transcribe_timeout_sec,
            )
        except Exception as exc:
            logger.warning("Groq voice transcribe failed: %s", exc)
            errors.append(f"groq: {exc}")
    else:
        errors.append("groq: API anahtari yok")

    openai_key = (settings.openai_api_key or "").strip()
    if openai_key:
        try:
            return _transcribe_with_provider(
                provider="openai",
                url=OPENAI_TRANSCRIBE_URL,
                api_key=openai_key,
                model=settings.voice_transcribe_openai_model,
                audio_bytes=audio_bytes,
                filename=filename,
                content_type=content_type,
                language=lang,
                timeout_sec=settings.voice_transcribe_timeout_sec,
            )
        except Exception as exc:
            logger.warning("OpenAI voice transcribe fallback failed: %s", exc)
            errors.append(f"openai: {exc}")
    else:
        errors.append("openai: API anahtari yok")

    detail = "; ".join(errors) if errors else "bilinmeyen hata"
    raise VoiceTranscriptionError(f"Ses tanima basarisiz ({detail}).")
