from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.constants.kvkk import KVKK_CONSENT_VERSION
from app.models import User


def user_needs_kvkk_consent(user: User) -> bool:
    if user.kvkk_consent_at is None:
        return True
    return (user.kvkk_consent_version or "") != KVKK_CONSENT_VERSION


def record_kvkk_consent(db: Session, user: User) -> None:
    now = datetime.now(timezone.utc)
    user.kvkk_consent_at = now
    user.kvkk_consent_version = KVKK_CONSENT_VERSION
    db.add(user)
    db.commit()
    db.refresh(user)


def require_and_record_kvkk_consent(db: Session, user: User, *, accepted: bool) -> None:
    if not user_needs_kvkk_consent(user):
        return
    if not accepted:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "kvkk_consent_required",
                "message": "Devam etmek icin KVKK aydinlatma metnini okuyup acik riza vermelisiniz.",
            },
        )
    record_kvkk_consent(db, user)
