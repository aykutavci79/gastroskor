from __future__ import annotations

from contextvars import ContextVar
from dataclasses import dataclass
from uuid import UUID

from fastapi import HTTPException, status

from app.core.config import settings
from app.services.access_token import AccessTokenClaims


@dataclass(frozen=True)
class RequestAuth:
    user_id: UUID
    email: str

    @classmethod
    def from_claims(cls, claims: AccessTokenClaims) -> RequestAuth:
        return cls(user_id=claims.user_id, email=claims.email)


_request_auth: ContextVar[RequestAuth | None] = ContextVar("request_auth", default=None)


def set_request_auth(auth: RequestAuth | None) -> None:
    _request_auth.set(auth)


def get_request_auth() -> RequestAuth | None:
    return _request_auth.get()


def auth_require_bearer() -> bool:
    if settings.auth_require_bearer is not None:
        return bool(settings.auth_require_bearer)
    return settings.environment.lower() == "production"


def normalize_email(email: str | None) -> str | None:
    if not email:
        return None
    cleaned = email.strip().lower()
    return cleaned or None


def resolve_authenticated_email(*, claimed_email: str | None) -> str:
    auth = get_request_auth()
    claimed = normalize_email(claimed_email)

    if auth_require_bearer():
        if auth is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Oturum gerekli. Google ile giris yapip tekrar deneyin.",
            )
        if claimed and claimed != auth.email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Oturum ile uyusmayan e-posta.",
            )
        return auth.email

    if auth is not None:
        if claimed and claimed != auth.email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Oturum ile uyusmayan e-posta.",
            )
        return auth.email

    if not claimed:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-posta veya oturum gerekli.",
        )
    return claimed


def resolve_optional_viewer_email(*, viewer_email: str | None) -> str | None:
    viewer = normalize_email(viewer_email)
    if not viewer:
        return None
    return resolve_authenticated_email(claimed_email=viewer)


def resolve_soft_optional_viewer_email(*, viewer_email: str | None) -> str | None:
    """Oturum yoksa 401 yerine None — salt okunur durum uclari icin."""
    viewer = normalize_email(viewer_email)
    if not viewer:
        return None
    auth = get_request_auth()
    if auth_require_bearer():
        if auth is None:
            return None
        if viewer != auth.email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Oturum ile uyusmayan e-posta.",
            )
        return auth.email
    return resolve_authenticated_email(claimed_email=viewer)
