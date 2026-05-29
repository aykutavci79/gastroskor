from __future__ import annotations

import secrets
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import CompensationCoupon, FeedbackMessage, PrivateFeedback
from app.schemas.feedback import CompensationCouponCreate
from app.services.feedback_authz import assert_restaurant_or_admin_access


def _generate_coupon_code(db: Session) -> str:
    for _ in range(8):
        code = f"GS-{secrets.token_hex(4).upper()}"
        exists = db.scalar(select(CompensationCoupon.id).where(CompensationCoupon.code == code))
        if not exists:
            return code
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate unique coupon code")


def issue_compensation_coupon(
    db: Session,
    *,
    feedback_id: UUID,
    payload: CompensationCouponCreate,
) -> tuple[CompensationCoupon, PrivateFeedback, dict]:
    feedback = db.get(PrivateFeedback, feedback_id)
    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")

    assert_restaurant_or_admin_access(
        db=db,
        feedback=feedback,
        actor_user_id=payload.actor_user_id,
        actor_user_email=payload.actor_user_email,
        actor_restaurant_id=payload.actor_restaurant_id,
        require_write=True,
    )

    if feedback.status not in {"open", "in_review"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Compensation coupon can only be issued for open or in_review feedback",
        )

    if payload.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="expires_at must be in the future")

    if not feedback.restaurant_id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Feedback is not linked to a restaurant")

    coupon = CompensationCoupon(
        feedback_id=feedback.id,
        restaurant_id=feedback.restaurant_id,
        user_id=feedback.author_id,
        discount_percent=payload.discount_percent,
        code=_generate_coupon_code(db),
        expires_at=payload.expires_at,
        status="issued",
    )
    db.add(coupon)

    feedback.status = "resolved"
    db.add(feedback)

    db.add(
        FeedbackMessage(
            feedback_id=feedback.id,
            sender_type="restaurant",
            message=(
                f"Telafi kuponu tanimlandi: %{payload.discount_percent} indirim. "
                f"Kod: {coupon.code}. Son kullanim: {payload.expires_at.isoformat()}."
            ),
            attachments_json={"type": "compensation_coupon", "code": coupon.code},
        )
    )

    db.commit()
    db.refresh(coupon)
    db.refresh(feedback)

    notification_payload = {
        "event": "compensation_coupon_issued",
        "feedback_id": str(feedback.id),
        "user_id": str(feedback.author_id),
        "coupon_code": coupon.code,
        "discount_percent": coupon.discount_percent,
        "expires_at": coupon.expires_at.isoformat(),
        "channel": "in_app",  # notification worker kuyrugu icin hazir payload
    }
    return coupon, feedback, notification_payload

