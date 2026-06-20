from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import RevokedRefreshToken
from app.services.access_token import RefreshTokenClaims, create_token_pair


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def is_refresh_token_revoked(db: Session, jti: str) -> bool:
    row = db.get(RevokedRefreshToken, jti)
    return row is not None


def revoke_refresh_token(
    db: Session,
    *,
    jti: str,
    user_id: UUID,
    expires_at: datetime,
) -> None:
    if is_refresh_token_revoked(db, jti):
        return
    db.add(
        RevokedRefreshToken(
            jti=jti,
            user_id=user_id,
            expires_at=expires_at,
            revoked_at=_utcnow(),
        )
    )


def assert_refresh_token_active(db: Session, jti: str) -> None:
    if is_refresh_token_revoked(db, jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Yenileme tokeni gecersiz veya iptal edilmis.",
        )


def exchange_refresh_token(db: Session, claims: RefreshTokenClaims, *, email: str) -> dict[str, int | str]:
    """Rotation: eski jti iptal, yeni token cifti uret."""
    assert_refresh_token_active(db, claims.jti)
    revoke_refresh_token(
        db,
        jti=claims.jti,
        user_id=claims.user_id,
        expires_at=claims.expires_at,
    )
    return create_token_pair(user_id=claims.user_id, email=email)


def cleanup_expired_revoked_refresh_tokens(db: Session, *, now: datetime | None = None) -> int:
    """Suresi dolmus iptal kayitlarini temizle (cron/manuel cagri icin)."""
    cutoff = now or _utcnow()
    result = db.execute(delete(RevokedRefreshToken).where(RevokedRefreshToken.expires_at < cutoff))
    db.flush()
    return int(result.rowcount or 0)
