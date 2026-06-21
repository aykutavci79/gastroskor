from __future__ import annotations

import io
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services.access_token import create_access_token
from app.services.voice_transcription import VoiceTranscriptionResult, transcribe_voice_audio

client = TestClient(app)


def _auth_headers() -> dict[str, str]:
    token, _ = create_access_token(user_id=uuid4(), email="voice-tester@example.com")
    return {"Authorization": f"Bearer {token}"}


def test_transcribe_voice_groq_success(monkeypatch) -> None:
    monkeypatch.setattr(settings, "groq_api_key", "groq-test")
    monkeypatch.setattr(settings, "openai_api_key", "openai-test")

    def fake_provider(**kwargs):
        assert kwargs["provider"] == "groq"
        return VoiceTranscriptionResult(text="150 lira lahmacun", provider="groq")

    monkeypatch.setattr(
        "app.services.voice_transcription._transcribe_with_provider",
        fake_provider,
    )

    result = transcribe_voice_audio(
        audio_bytes=b"fake-audio",
        filename="voice.m4a",
        content_type="audio/m4a",
        language="tr",
    )
    assert result.text == "150 lira lahmacun"
    assert result.provider == "groq"


def test_transcribe_voice_falls_back_to_openai(monkeypatch) -> None:
    monkeypatch.setattr(settings, "groq_api_key", "groq-test")
    monkeypatch.setattr(settings, "openai_api_key", "openai-test")

    calls: list[str] = []

    def fake_provider(**kwargs):
        calls.append(kwargs["provider"])
        if kwargs["provider"] == "groq":
            raise RuntimeError("groq down")
        return VoiceTranscriptionResult(text="200 lira cantik", provider="openai")

    monkeypatch.setattr(
        "app.services.voice_transcription._transcribe_with_provider",
        fake_provider,
    )

    result = transcribe_voice_audio(
        audio_bytes=b"fake-audio",
        filename="voice.m4a",
        content_type="audio/m4a",
    )
    assert calls == ["groq", "openai"]
    assert result.provider == "openai"
    assert result.text == "200 lira cantik"


def test_transcribe_endpoint_requires_provider_keys(monkeypatch) -> None:
    monkeypatch.setattr("app.core.security_middleware.user_account_is_deleted", lambda _user_id: False)
    monkeypatch.setattr(settings, "groq_api_key", None)
    monkeypatch.setattr(settings, "openai_api_key", None)

    response = client.post(
        "/api/v1/voice/transcribe",
        files={"file": ("voice.m4a", io.BytesIO(b"abc"), "audio/m4a")},
        data={"language": "tr"},
        headers=_auth_headers(),
    )
    assert response.status_code == 503


def test_transcribe_endpoint_requires_auth(monkeypatch) -> None:
    monkeypatch.setattr(settings, "groq_api_key", "groq-test")
    monkeypatch.setattr(settings, "openai_api_key", None)
    monkeypatch.setattr(settings, "auth_require_bearer", False)

    response = client.post(
        "/api/v1/voice/transcribe",
        files={"file": ("voice.m4a", io.BytesIO(b"abc"), "audio/m4a")},
        data={"language": "tr"},
    )
    assert response.status_code == 401


def test_transcribe_endpoint_success(monkeypatch) -> None:
    monkeypatch.setattr("app.core.security_middleware.user_account_is_deleted", lambda _user_id: False)
    monkeypatch.setattr(settings, "groq_api_key", "groq-test")
    monkeypatch.setattr(settings, "openai_api_key", None)

    def fake_transcribe(**_kwargs):
        return VoiceTranscriptionResult(text="150 TL lahmacun", provider="groq")

    monkeypatch.setattr("app.api.v1.voice_routes.transcribe_voice_audio", fake_transcribe)

    response = client.post(
        "/api/v1/voice/transcribe",
        files={"file": ("voice.m4a", io.BytesIO(b"abc"), "audio/m4a")},
        data={"language": "tr"},
        headers=_auth_headers(),
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["text"] == "150 TL lahmacun"
    assert payload["provider"] == "groq"
