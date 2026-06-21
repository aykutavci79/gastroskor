"""Aktif (silinmemis) kullanici cozumlemesi — JWT + deleted_at."""

from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User
from app.db.session import SessionLocal
from app.services.request_identity import RequestAuth, get_request_auth, require_request_auth, resolve_authenticated_email

ACCOUNT_DELETED_DETAIL = "Hesap silinmis."


def assert_account_active(user: User) -> None:
    if user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ACCOUNT_DELETED_DETAIL,
        )


def user_account_is_deleted(user_id: UUID) -> bool:
    """Middleware icin hafif kontrol — kullanici yoksa veya silinmisse True."""
    db = SessionLocal()
    try:
        row = db.execute(select(User.deleted_at).where(User.id == user_id)).first()
        if row is None:
            return True
        return row[0] is not None
    finally:
        db.close()


def get_active_user_by_id(db: Session, user_id: UUID) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kullanici bulunamadi.")
    assert_account_active(user)
    return user


def get_active_user_for_auth(db: Session, auth: RequestAuth) -> User:
    user = get_active_user_by_id(db, auth.user_id)
    if user.email.strip().lower() != auth.email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Oturum bulunamadi.")
    return user


def resolve_active_user_by_email(
    db: Session,
    email: str,
    *,
    not_found_detail: str = "Kullanici bulunamadi.",
) -> User:
    verified_email = resolve_authenticated_email(claimed_email=email)
    user = db.scalar(select(User).where(User.email == verified_email))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=not_found_detail)
    assert_account_active(user)
    return user


def require_active_request_user(db: Session) -> User:
    auth = require_request_auth()
    return get_active_user_for_auth(db, auth)


def try_get_active_request_user(db: Session) -> User | None:
    auth = get_request_auth()
    if auth is None:
        return None
    return get_active_user_for_auth(db, auth)
