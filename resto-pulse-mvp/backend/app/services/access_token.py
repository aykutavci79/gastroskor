from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID

from jose import JWTError, jwt

from app.core.config import settings


@dataclass(frozen=True)
class AccessTokenClaims:
    user_id: UUID
    email: str


@dataclass(frozen=True)
class RefreshTokenClaims:
    user_id: UUID
    email: str
    jti: str
    expires_at: datetime


def create_access_token(*, user_id: UUID, email: str) -> tuple[str, int]:
    expires_hours = max(1, int(settings.jwt_access_token_expire_hours))
    expires_delta = timedelta(hours=expires_hours)
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "email": email.strip().lower(),
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
        "typ": "access",
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, int(expires_delta.total_seconds())


def create_refresh_token(*, user_id: UUID, email: str) -> tuple[str, int]:
    from uuid import uuid4

    expires_days = max(1, int(settings.jwt_refresh_token_expire_days))
    expires_delta = timedelta(days=expires_days)
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "email": email.strip().lower(),
        "jti": str(uuid4()),
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
        "typ": "refresh",
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, int(expires_delta.total_seconds())


def create_token_pair(*, user_id: UUID, email: str) -> dict[str, int | str]:
    access_token, access_expires_in = create_access_token(user_id=user_id, email=email)
    refresh_token, refresh_expires_in = create_refresh_token(user_id=user_id, email=email)
    return {
        "access_token": access_token,
        "expires_in": access_expires_in,
        "refresh_token": refresh_token,
        "refresh_expires_in": refresh_expires_in,
    }


def decode_access_token(token: str) -> AccessTokenClaims:
    payload = _decode_token(token)
    if payload.get("typ") != "access":
        raise ValueError("Gecersiz oturum tipi.")

    sub = str(payload.get("sub") or "").strip()
    email = str(payload.get("email") or "").strip().lower()
    if not sub or not email:
        raise ValueError("Eksik oturum bilgisi.")

    try:
        user_id = UUID(sub)
    except ValueError as exc:
        raise ValueError("Gecersiz oturum kimligi.") from exc

    return AccessTokenClaims(user_id=user_id, email=email)


def decode_refresh_token(token: str) -> RefreshTokenClaims:
    payload = _decode_token(token)
    if payload.get("typ") != "refresh":
        raise ValueError("Gecersiz yenileme tokeni.")

    sub = str(payload.get("sub") or "").strip()
    email = str(payload.get("email") or "").strip().lower()
    jti = str(payload.get("jti") or "").strip()
    exp = payload.get("exp")
    if not sub or not email or not jti or exp is None:
        raise ValueError("Eksik yenileme bilgisi.")

    try:
        user_id = UUID(sub)
    except ValueError as exc:
        raise ValueError("Gecersiz oturum kimligi.") from exc

    try:
        expires_at = datetime.fromtimestamp(int(exp), tz=timezone.utc)
    except (TypeError, ValueError, OSError) as exc:
        raise ValueError("Gecersiz yenileme suresi.") from exc

    return RefreshTokenClaims(user_id=user_id, email=email, jti=jti, expires_at=expires_at)


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise ValueError("Gecersiz veya suresi dolmus oturum.") from exc
