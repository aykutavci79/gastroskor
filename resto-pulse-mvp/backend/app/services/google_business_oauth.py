from __future__ import annotations

import base64
import hashlib
import hmac
import time
import uuid
from urllib.parse import urlencode

import httpx

from app.core.config import settings

GBP_SCOPE = "https://www.googleapis.com/auth/business.manage"
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


class GoogleBusinessOAuthError(RuntimeError):
    pass


def _client_configured() -> bool:
    return bool(settings.google_oauth_web_client_id and settings.google_oauth_web_client_secret)


def google_business_redirect_uri() -> str:
    base = (settings.public_api_base_url or "http://localhost:8000").rstrip("/")
    prefix = settings.api_v1_prefix.rstrip("/")
    return f"{base}{prefix}/panel/google-business/callback"


def sign_oauth_state(*, ownership_id: uuid.UUID, user_id: uuid.UUID) -> str:
    expires = int(time.time()) + 900
    payload = f"{ownership_id}:{user_id}:{expires}"
    sig = hmac.new(
        (settings.jwt_secret or "change-me").encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()
    raw = f"{payload}:{sig}".encode()
    return base64.urlsafe_b64encode(raw).decode()


def verify_oauth_state(state: str) -> tuple[uuid.UUID, uuid.UUID]:
    try:
        decoded = base64.urlsafe_b64decode(state.encode()).decode()
        ownership_raw, user_raw, expires_raw, sig = decoded.rsplit(":", 3)
        payload = f"{ownership_raw}:{user_raw}:{expires_raw}"
        expected = hmac.new(
            (settings.jwt_secret or "change-me").encode(),
            payload.encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, sig):
            raise GoogleBusinessOAuthError("OAuth state gecersiz.")
        if int(expires_raw) < int(time.time()):
            raise GoogleBusinessOAuthError("OAuth oturumu zaman asimina ugradi. Tekrar deneyin.")
        return uuid.UUID(ownership_raw), uuid.UUID(user_raw)
    except (ValueError, TypeError) as exc:
        raise GoogleBusinessOAuthError("OAuth state cozulemedi.") from exc


def build_authorization_url(*, ownership_id: uuid.UUID, user_id: uuid.UUID) -> str:
    if not _client_configured():
        raise GoogleBusinessOAuthError(
            "Google OAuth client secret tanimli degil (GOOGLE_OAUTH_WEB_CLIENT_SECRET)."
        )
    params = {
        "client_id": settings.google_oauth_web_client_id,
        "redirect_uri": google_business_redirect_uri(),
        "response_type": "code",
        "scope": GBP_SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
        "state": sign_oauth_state(ownership_id=ownership_id, user_id=user_id),
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_code_for_tokens(code: str) -> dict:
    if not _client_configured():
        raise GoogleBusinessOAuthError("Google OAuth yapilandirmasi eksik.")
    data = {
        "code": code,
        "client_id": settings.google_oauth_web_client_id,
        "client_secret": settings.google_oauth_web_client_secret,
        "redirect_uri": google_business_redirect_uri(),
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(GOOGLE_TOKEN_URL, data=data)
        if response.status_code >= 400:
            detail = response.text[:300]
            raise GoogleBusinessOAuthError(f"Google token degisimi basarisiz: {detail}")
        return response.json()


async def refresh_access_token(refresh_token: str) -> dict:
    if not _client_configured():
        raise GoogleBusinessOAuthError("Google OAuth yapilandirmasi eksik.")
    data = {
        "client_id": settings.google_oauth_web_client_id,
        "client_secret": settings.google_oauth_web_client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(GOOGLE_TOKEN_URL, data=data)
        if response.status_code >= 400:
            detail = response.text[:300]
            raise GoogleBusinessOAuthError(f"Google token yenileme basarisiz: {detail}")
        return response.json()
