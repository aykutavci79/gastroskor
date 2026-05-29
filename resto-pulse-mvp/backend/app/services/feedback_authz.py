from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import PrivateFeedback, User
from app.services.panel_access import assert_verified_owner_for_restaurant


def resolve_user_identity(db: Session, *, user_id: str | None, email: str | None) -> User | None:
    from sqlalchemy import select

    if user_id:
        try:
            user_uuid = UUID(user_id)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid actor_user_id",
            ) from exc
        user = db.get(User, user_uuid)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return user

    if email:
        user = db.scalar(select(User).where(User.email == email))
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return user
    return None


def assert_restaurant_or_admin_access(
    *,
    db: Session,
    feedback: PrivateFeedback,
    actor_user_id: str | None,
    actor_user_email: str | None,
    actor_restaurant_id: str | None,
    require_write: bool = False,
) -> None:
    actor_user = resolve_user_identity(db, user_id=actor_user_id, email=actor_user_email)
    if not actor_user:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="actor_user_id or actor_user_email is required",
        )

    if actor_user.role == "admin":
        return

    if not actor_restaurant_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="actor_restaurant_id is required for restaurant staff",
        )

    if not feedback.restaurant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Feedback has no restaurant mapping")

    if actor_restaurant_id != str(feedback.restaurant_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Restaurant not authorized for this feedback")

    assert_verified_owner_for_restaurant(
        db,
        actor_user,
        feedback.restaurant_id,
        require_write=require_write,
    )


def assert_feedback_read_access(
    *,
    db: Session,
    feedback: PrivateFeedback,
    actor_user_id: str | None,
    actor_user_email: str | None,
    actor_restaurant_id: str | None,
) -> None:
    actor_user = resolve_user_identity(db, user_id=actor_user_id, email=actor_user_email)
    if not actor_user:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="actor_user_id or actor_user_email is required",
        )

    if actor_user.role == "admin":
        return

    if actor_user.id == feedback.author_id:
        return

    if actor_restaurant_id and feedback.restaurant_id and actor_restaurant_id == str(feedback.restaurant_id):
        assert_verified_owner_for_restaurant(db, actor_user, feedback.restaurant_id, require_write=False)
        return

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to read this feedback")
