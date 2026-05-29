from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import CompensationCoupon, FeedbackMessage, PrivateFeedback, Restaurant, User
from app.schemas.feedback import FeedbackMessageCreate, PrivateFeedbackCreate
from app.services.feedback_authz import (
    assert_feedback_read_access,
    assert_restaurant_or_admin_access,
    resolve_user_identity,
)
from app.services.panel_access import assert_verified_owner_for_restaurant


def create_private_feedback(
    db: Session,
    *,
    payload: PrivateFeedbackCreate,
    author_id: UUID,
) -> PrivateFeedback:
    restaurant_uuid: UUID | None = None
    if payload.restaurant_id:
        try:
            restaurant_uuid = UUID(payload.restaurant_id)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid restaurant_id",
            ) from exc

        restaurant = db.get(Restaurant, restaurant_uuid)
        if not restaurant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found")

    feedback = PrivateFeedback(
        place_id=payload.place_id,
        restaurant_id=restaurant_uuid,
        author_id=author_id,
        category=payload.category,
        severity=payload.severity,
        visit_at=payload.visit_at,
        message=payload.message,
        status="open",
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


def resolve_user_uuid(
    db: Session,
    *,
    user_id: str | None,
    email: str | None,
) -> UUID | None:
    if user_id:
        try:
            return UUID(user_id)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid user_id",
            ) from exc
    if email:
        user = db.scalar(select(User).where(User.email == email))
        return user.id if user else None
    return None


def list_private_feedbacks_for_user(
    db: Session,
    *,
    user_uuid: UUID,
) -> list[PrivateFeedback]:
    rows = db.scalars(
        select(PrivateFeedback).where(PrivateFeedback.author_id == user_uuid).order_by(PrivateFeedback.created_at.desc())
    ).all()
    return list(rows)


def list_private_feedbacks_for_panel(
    db: Session,
    *,
    actor_user_id: str | None,
    actor_user_email: str | None,
    actor_restaurant_id: str | None,
    status_filter: str | None,
    limit: int,
) -> list[PrivateFeedback]:
    actor_user = resolve_user_identity(db, user_id=actor_user_id, email=actor_user_email)
    if not actor_user:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="actor_user_id or actor_user_email is required",
        )

    stmt = select(PrivateFeedback)
    if status_filter:
        stmt = stmt.where(PrivateFeedback.status == status_filter)

    if actor_user.role == "admin":
        if actor_restaurant_id:
            try:
                stmt = stmt.where(PrivateFeedback.restaurant_id == UUID(actor_restaurant_id))
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Invalid actor_restaurant_id",
                ) from exc
    else:
        if not actor_restaurant_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="actor_restaurant_id is required for restaurant staff",
            )
        try:
            restaurant_uuid = UUID(actor_restaurant_id)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid actor_restaurant_id",
            ) from exc
        assert_verified_owner_for_restaurant(db, actor_user, restaurant_uuid, require_write=False)
        stmt = stmt.where(PrivateFeedback.restaurant_id == restaurant_uuid)

    rows = db.scalars(stmt.order_by(PrivateFeedback.created_at.desc()).limit(limit)).all()
    return list(rows)


def create_feedback_message(
    db: Session,
    *,
    feedback_id: UUID,
    payload: FeedbackMessageCreate,
) -> FeedbackMessage:
    feedback = db.get(PrivateFeedback, feedback_id)
    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")

    if payload.sender_type == "user":
        actor_user_uuid = resolve_user_uuid(db, user_id=payload.actor_user_id, email=payload.actor_user_email)
        if not actor_user_uuid:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="actor_user_id or actor_user_email is required for sender_type=user",
            )
        if actor_user_uuid != feedback.author_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User cannot message this feedback")
    else:
        assert_restaurant_or_admin_access(
            db=db,
            feedback=feedback,
            actor_user_id=payload.actor_user_id,
            actor_user_email=payload.actor_user_email,
            actor_restaurant_id=payload.actor_restaurant_id,
            require_write=True,
        )

    row = FeedbackMessage(
        feedback_id=feedback_id,
        sender_type=payload.sender_type,
        message=payload.message,
        attachments_json=payload.attachments_json,
    )
    db.add(row)

    if feedback.status == "open":
        feedback.status = "in_review"
        db.add(feedback)

    db.commit()
    db.refresh(row)
    return row


def update_private_feedback_status(
    db: Session,
    *,
    feedback_id: UUID,
    status_value: str,
    actor_user_id: str | None,
    actor_user_email: str | None,
    actor_restaurant_id: str | None,
) -> PrivateFeedback:
    feedback = db.get(PrivateFeedback, feedback_id)
    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")

    assert_restaurant_or_admin_access(
        db=db,
        feedback=feedback,
        actor_user_id=actor_user_id,
        actor_user_email=actor_user_email,
        actor_restaurant_id=actor_restaurant_id,
        require_write=True,
    )

    feedback.status = status_value
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


def get_private_feedback_detail(
    db: Session,
    *,
    feedback_id: UUID,
    actor_user_id: str | None,
    actor_user_email: str | None,
    actor_restaurant_id: str | None,
) -> tuple[PrivateFeedback, list[FeedbackMessage], CompensationCoupon | None]:
    feedback = db.scalar(
        select(PrivateFeedback)
        .where(PrivateFeedback.id == feedback_id)
        .options(selectinload(PrivateFeedback.messages))
    )
    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")

    assert_feedback_read_access(
        db=db,
        feedback=feedback,
        actor_user_id=actor_user_id,
        actor_user_email=actor_user_email,
        actor_restaurant_id=actor_restaurant_id,
    )

    latest_coupon = db.scalar(
        select(CompensationCoupon)
        .where(CompensationCoupon.feedback_id == feedback.id)
        .order_by(CompensationCoupon.created_at.desc())
        .limit(1)
    )
    messages = sorted(feedback.messages, key=lambda row: row.created_at)
    return feedback, messages, latest_coupon

