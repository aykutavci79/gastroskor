from __future__ import annotations

import mimetypes

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.core.config import settings
from app.schemas.voice import VoiceTranscribeResponse
from app.services.voice_transcription import VoiceTranscriptionError, transcribe_voice_audio

router = APIRouter(prefix="/voice", tags=["voice"])

_ALLOWED_MIME = {
    "audio/m4a",
    "audio/mp4",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/webm",
    "audio/x-m4a",
    "application/octet-stream",
}


def _guess_content_type(upload: UploadFile, filename: str) -> str:
    declared = (upload.content_type or "").strip().lower()
    if declared in _ALLOWED_MIME:
        return declared
    guessed, _ = mimetypes.guess_type(filename)
    return (guessed or "audio/m4a").lower()


@router.post("/transcribe", response_model=VoiceTranscribeResponse)
async def transcribe_voice(
    file: UploadFile = File(...),
    language: str = Form(default="tr"),
):
    if not (settings.groq_api_key or settings.openai_api_key):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Ses tanima servisi yapilandirilmamis.",
        )

    raw = await file.read()
    max_bytes = settings.voice_transcribe_max_bytes
    if len(raw) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Ses dosyasi cok buyuk (max {max_bytes // 1_000_000} MB).",
        )
    if not raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ses dosyasi bos.")

    filename = (file.filename or "voice.m4a").strip() or "voice.m4a"
    content_type = _guess_content_type(file, filename)
    if content_type not in _ALLOWED_MIME and not filename.lower().endswith((".m4a", ".mp4", ".wav", ".webm", ".mp3")):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Desteklenmeyen ses formati.",
        )

    try:
        result = transcribe_voice_audio(
            audio_bytes=raw,
            filename=filename,
            content_type=content_type,
            language=language,
        )
    except VoiceTranscriptionError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return VoiceTranscribeResponse(text=result.text, provider=result.provider, language=language or "tr")
