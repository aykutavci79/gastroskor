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


def decode_access_token(token: str) -> AccessTokenClaims:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise ValueError("Gecersiz veya suresi dolmus oturum.") from exc

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
