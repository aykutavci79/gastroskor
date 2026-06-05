from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import FollowerCoupon, RestaurantOwnership, User, UserRestaurantFollow
from app.services.user_notification_service import mask_email


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def list_panel_followers(
    db: Session,
    *,
    restaurant_id: UUID,
    limit: int = 100,
    offset: int = 0,
) -> dict:
    total = (
        db.scalar(
            select(func.count(UserRestaurantFollow.id)).where(
                UserRestaurantFollow.restaurant_id == restaurant_id
            )
        )
        or 0
    )
    follow_rows = db.scalars(
        select(UserRestaurantFollow)
        .where(UserRestaurantFollow.restaurant_id == restaurant_id)
        .order_by(UserRestaurantFollow.created_at.desc())
        .offset(offset)
        .limit(limit)
        .options(selectinload(UserRestaurantFollow.user))
    ).all()

    now = _utcnow()
    items: list[dict] = []
    for follow in follow_rows:
        user = follow.user
        if not user:
            continue
        coupon = db.scalars(
            select(FollowerCoupon)
            .where(
                FollowerCoupon.user_id == user.id,
                FollowerCoupon.restaurant_id == restaurant_id,
                FollowerCoupon.status == "issued",
                FollowerCoupon.expires_at > now,
            )
            .options(selectinload(FollowerCoupon.promotion))
            .order_by(FollowerCoupon.created_at.desc())
            .limit(1)
        ).first()
        discount = coupon.promotion.discount_percent if coupon and coupon.promotion else None
        items.append(
            {
                "user_id": str(user.id),
                "display_name": user.full_name,
                "email_masked": mask_email(user.email),
                "followed_at": follow.created_at,
                "has_active_coupon": coupon is not None,
                "coupon_code": coupon.code if coupon else None,
                "coupon_discount_percent": discount,
            }
        )

    return {"items": items, "total": total}


def require_ownership_for_restaurant(db: Session, *, user_id: UUID, restaurant_id: UUID) -> RestaurantOwnership:
    ownership = db.scalar(
        select(RestaurantOwnership).where(
            RestaurantOwnership.user_id == user_id,
            RestaurantOwnership.restaurant_id == restaurant_id,
        )
    )
    if not ownership:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu mekan icin yetkiniz yok.")
    return ownership
