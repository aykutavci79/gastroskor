from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID

import httpx
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import FollowerCoupon, Restaurant, User, UserNotification, UserPushToken

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def mask_email(email: str) -> str:
    normalized = email.strip().lower()
    local, sep, domain = normalized.partition("@")
    if not sep:
        return "***"
    if len(local) <= 1:
        return f"*@{domain}"
    return f"{local[0]}***@{domain}"


def register_push_token(
    db: Session,
    *,
    user_id: UUID,
    expo_push_token: str,
    platform: str | None,
) -> None:
    token = expo_push_token.strip()
    if not token:
        return
    row = db.scalar(select(UserPushToken).where(UserPushToken.expo_push_token == token))
    now = _utcnow()
    if row:
        row.user_id = user_id
        row.platform = platform
        row.updated_at = now
    else:
        db.add(
            UserPushToken(
                user_id=user_id,
                expo_push_token=token,
                platform=platform,
                updated_at=now,
            )
        )
    db.commit()


def notification_to_dict(row: UserNotification) -> dict:
    return {
        "id": str(row.id),
        "notification_type": row.notification_type,
        "title": row.title,
        "message": row.message,
        "read_at": row.read_at.isoformat() if row.read_at else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "metadata": row.metadata_json or {},
    }


def list_user_notifications(db: Session, *, user_id: UUID, limit: int = 40) -> dict:
    rows = db.scalars(
        select(UserNotification)
        .where(UserNotification.user_id == user_id)
        .order_by(UserNotification.created_at.desc())
        .limit(limit)
    ).all()
    unread = (
        db.scalar(
            select(func.count(UserNotification.id)).where(
                UserNotification.user_id == user_id,
                UserNotification.read_at.is_(None),
            )
        )
        or 0
    )
    return {
        "items": [notification_to_dict(row) for row in rows],
        "unread_count": unread,
    }


def mark_notification_read(db: Session, *, user_id: UUID, notification_id: UUID) -> bool:
    row = db.scalar(
        select(UserNotification).where(
            UserNotification.id == notification_id,
            UserNotification.user_id == user_id,
        )
    )
    if not row:
        return False
    if not row.read_at:
        row.read_at = _utcnow()
        db.commit()
    return True


def _send_expo_push(tokens: list[str], *, title: str, body: str, data: dict) -> None:
    if not tokens:
        return
    messages = [
        {
            "to": token,
            "title": title,
            "body": body,
            "data": data,
            "sound": "default",
        }
        for token in tokens
    ]
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(EXPO_PUSH_URL, json=messages)
            if response.status_code >= 400:
                logger.warning("Expo push HTTP %s: %s", response.status_code, response.text[:300])
    except Exception:
        logger.exception("Expo push failed")


def notify_follower_coupon_issued(
    db: Session,
    *,
    user: User,
    restaurant: Restaurant,
    coupon: FollowerCoupon,
    promo_title: str | None = None,
) -> UserNotification:
    if coupon.promotion is None and coupon.promotion_id:
        loaded = db.scalar(
            select(FollowerCoupon)
            .where(FollowerCoupon.id == coupon.id)
            .options(selectinload(FollowerCoupon.promotion))
        )
        if loaded:
            coupon = loaded
    discount = coupon.promotion.discount_percent if coupon.promotion else 0
    title = promo_title or (coupon.promotion.title if coupon.promotion else "Takipçi indirimi")
    message = (
        f"«{restaurant.name}» için %{discount} indirim kuponunuz hazır. "
        f"Kod: {coupon.code} — restoran detayında veya Profil → Kuponlarım."
    )
    metadata = {
        "restaurant_id": str(restaurant.id),
        "coupon_id": str(coupon.id),
        "coupon_code": coupon.code,
        "discount_percent": discount,
        "open_path": f"/restaurant/{restaurant.id}",
    }
    row = UserNotification(
        user_id=user.id,
        notification_type="follower_coupon",
        title=title,
        message=message,
        metadata_json=metadata,
    )
    db.add(row)
    db.flush()

    tokens = list(
        db.scalars(select(UserPushToken.expo_push_token).where(UserPushToken.user_id == user.id)).all()
    )
    push_title = f"{restaurant.name} — kuponunuz hazır"
    push_body = f"%{discount} indirim · {coupon.code}"
    _send_expo_push(tokens, title=push_title, body=push_body, data=metadata)
    return row
