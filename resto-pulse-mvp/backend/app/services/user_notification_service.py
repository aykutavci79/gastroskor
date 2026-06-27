from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID

import httpx
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    FollowerCoupon,
    Restaurant,
    RestaurantOrder,
    RestaurantOwnership,
    Review,
    ReviewRemedyOffer,
    ReviewReply,
    User,
    UserNotification,
    UserPushToken,
)
from app.services.restaurant_orders import format_order_number

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


def _truncate_text(text: str, max_len: int = 120) -> str:
    cleaned = text.strip()
    if len(cleaned) <= max_len:
        return cleaned
    return cleaned[: max_len - 1].rstrip() + "…"


def _is_verified_restaurant_owner(db: Session, *, user_id: UUID, restaurant_id: UUID) -> bool:
    ownership = db.scalar(
        select(RestaurantOwnership).where(
            RestaurantOwnership.user_id == user_id,
            RestaurantOwnership.restaurant_id == restaurant_id,
            RestaurantOwnership.verification_status.in_(("verified", "verified_sms")),
        )
    )
    return ownership is not None


def _actor_label(db: Session, actor: User, *, restaurant_id: UUID) -> tuple[str, bool]:
    is_owner = _is_verified_restaurant_owner(db, user_id=actor.id, restaurant_id=restaurant_id)
    if is_owner:
        restaurant = db.get(Restaurant, restaurant_id)
        if restaurant and restaurant.name.strip():
            return restaurant.name.strip(), True
    name = (actor.full_name or "").strip()
    if name:
        return name, False
    return mask_email(actor.email), False


def _review_notification_metadata(review: Review, **extra: object) -> dict:
    metadata = {
        "restaurant_id": str(review.restaurant_id),
        "review_id": str(review.id),
        "open_path": f"/restaurant/{review.restaurant_id}",
    }
    metadata.update(extra)
    return metadata


def _persist_user_notification(
    db: Session,
    *,
    recipient_id: UUID,
    notification_type: str,
    title: str,
    message: str,
    metadata: dict,
    push_title: str,
    push_body: str,
) -> UserNotification | None:
    row = UserNotification(
        user_id=recipient_id,
        notification_type=notification_type,
        title=title,
        message=message,
        metadata_json=metadata,
    )
    db.add(row)
    db.flush()

    tokens = list(
        db.scalars(select(UserPushToken.expo_push_token).where(UserPushToken.user_id == recipient_id)).all()
    )
    _send_expo_push(tokens, title=push_title, body=push_body, data=metadata)
    return row


def notify_review_reply(
    db: Session,
    *,
    review: Review,
    reply: ReviewReply,
    actor: User,
) -> UserNotification | None:
    if not review.author_id or review.author_id == actor.id:
        return None

    actor_name, is_restaurant = _actor_label(db, actor, restaurant_id=review.restaurant_id)
    snippet = _truncate_text(reply.reply_text)
    if is_restaurant:
        title = "İşletme yorumunuza yanıt verdi"
        message = f"{actor_name} yorumunuza cevap yazdı: «{snippet}»"
        push_title = f"{actor_name} yanıt verdi"
    else:
        title = "Yorumunuza yanıt geldi"
        message = f"{actor_name} yorumunuza cevap yazdı: «{snippet}»"
        push_title = "Yorumunuza yeni cevap"

    metadata = _review_notification_metadata(
        review,
        reply_id=str(reply.id),
        actor_user_id=str(actor.id),
        is_restaurant_owner=is_restaurant,
    )
    return _persist_user_notification(
        db,
        recipient_id=review.author_id,
        notification_type="review_reply",
        title=title,
        message=message,
        metadata=metadata,
        push_title=push_title,
        push_body=snippet,
    )


def notify_review_helpful(
    db: Session,
    *,
    review: Review,
    actor: User,
) -> UserNotification | None:
    if not review.author_id or review.author_id == actor.id:
        return None

    actor_name, is_restaurant = _actor_label(db, actor, restaurant_id=review.restaurant_id)
    if is_restaurant:
        title = "İşletme yorumunuzu beğendi"
        message = f"{actor_name} yorumunuzu yararlı buldu."
        push_title = f"{actor_name} yorumunuzu beğendi"
    else:
        title = "Yorumunuz beğenildi"
        message = f"{actor_name} yorumunuzu yararlı buldu."
        push_title = "Yorumunuz beğenildi"

    metadata = _review_notification_metadata(
        review,
        actor_user_id=str(actor.id),
        is_restaurant_owner=is_restaurant,
    )
    return _persist_user_notification(
        db,
        recipient_id=review.author_id,
        notification_type="review_helpful",
        title=title,
        message=message,
        metadata=metadata,
        push_title=push_title,
        push_body=message,
    )


def notify_gourmet_chat_mention(
    db: Session,
    *,
    recipient: User,
    actor: User,
    actor_name: str,
    room_slug: str,
    room_title: str,
    body: str,
) -> UserNotification | None:
    if recipient.id == actor.id:
        return None
    snippet = _truncate_text(body, max_len=100)
    title = f"{room_title} odasinda bahsedildiniz"
    message = f"@{actor_name} sizi etiketledi: «{snippet}»"
    metadata = {
        "room_slug": room_slug,
        "room_title": room_title,
        "actor_user_id": str(actor.id),
        "actor_nickname": actor_name,
        "open_path": f"/gurme/{room_slug}",
    }
    return _persist_user_notification(
        db,
        recipient_id=recipient.id,
        notification_type="gourmet_chat_mention",
        title=title,
        message=message,
        metadata=metadata,
        push_title=f"@{actor_name} seni etiketledi",
        push_body=snippet,
    )


def notify_dm_message(
    db: Session,
    *,
    recipient: User,
    actor: User,
    thread_id: UUID,
    body: str,
) -> UserNotification | None:
    if recipient.id == actor.id:
        return None
    actor_name = actor.nickname or "Gurme"
    snippet = _truncate_text(body, max_len=100)
    title = f"@{actor_name} size mesaj gonderdi"
    message = f"«{snippet}»"
    metadata = {
        "actor_user_id": str(actor.id),
        "actor_nickname": actor_name,
        "thread_id": str(thread_id),
        "open_path": f"/dm/{thread_id}",
    }
    return _persist_user_notification(
        db,
        recipient_id=recipient.id,
        notification_type="dm_message",
        title=title,
        message=message,
        metadata=metadata,
        push_title=f"@{actor_name} mesaj gonderdi",
        push_body=snippet,
    )


def notify_order_rejected(
    db: Session,
    *,
    order: RestaurantOrder,
    restaurant: Restaurant,
    reject_message: str,
) -> UserNotification | None:
    customer = order.user
    if customer is None:
        customer = db.get(User, order.user_id)
    if customer is None:
        return None

    order_no = format_order_number(order.order_day, order.daily_no)
    restaurant_name = (restaurant.name or "Restoran").strip()
    detail = reject_message.strip() or "Restoran su an siparis kabul edemiyor"
    title = f"{restaurant_name} siparisinizi iptal etti"
    if order_no:
        message = f"{restaurant_name}, {detail} nedeniyle {order_no} numarali siparisinizi iptal etti."
    else:
        message = f"{restaurant_name}, {detail} nedeniyle siparisinizi iptal etti."
    push_body = f"{detail} nedeniyle siparisinizi iptal etti."

    metadata = {
        "order_id": str(order.id),
        "restaurant_id": str(restaurant.id),
        "restaurant_name": restaurant_name,
        "reject_reason_code": order.reject_reason_code,
        "reject_reason_text": order.reject_reason_text,
        "reject_message": detail,
        "open_path": f"/restaurant/{restaurant.id}",
    }
    return _persist_user_notification(
        db,
        recipient_id=customer.id,
        notification_type="order_rejected",
        title=title,
        message=message,
        metadata=metadata,
        push_title=title,
        push_body=push_body,
    )


def notify_reservation_approved(
    db: Session,
    *,
    reservation,
    restaurant: Restaurant,
) -> UserNotification | None:
    from app.services.table_reservations import zone_label_tr

    customer = reservation.user
    if customer is None:
        customer = db.get(User, reservation.user_id)
    if customer is None:
        return None
    restaurant_name = (restaurant.name or "Restoran").strip()
    zone = zone_label_tr(reservation.zone)
    table = reservation.table_label
    when = reservation.reserved_at.strftime("%d.%m.%Y %H:%M") if reservation.reserved_at else ""
    title = f"{restaurant_name} rezervasyonunuzu onayladi"
    message = (
        f"{zone} · {table} · {reservation.party_size} kisi · {when}. "
        "24 saat icinde uygulamadan onaylayin."
    )
    metadata = {
        "reservation_id": str(reservation.id),
        "restaurant_id": str(restaurant.id),
        "restaurant_name": restaurant_name,
        "open_path": f"/online-rezervasyon/{reservation.id}",
    }
    return _persist_user_notification(
        db,
        recipient_id=customer.id,
        notification_type="reservation_approved",
        title=title,
        message=message,
        metadata=metadata,
        push_title=title,
        push_body="Onay icin uygulamaya dokunun (24 saat).",
    )


def notify_reservation_rejected(
    db: Session,
    *,
    reservation,
    restaurant: Restaurant,
) -> UserNotification | None:
    customer = reservation.user
    if customer is None:
        customer = db.get(User, reservation.user_id)
    if customer is None:
        return None
    restaurant_name = (restaurant.name or "Restoran").strip()
    detail = (reservation.reject_reason_text or "").strip() or "Restoran su an rezervasyon kabul edemiyor"
    title = f"{restaurant_name} rezervasyon talebinizi reddetti"
    message = f"{restaurant_name}: {detail}"
    metadata = {
        "reservation_id": str(reservation.id),
        "restaurant_id": str(restaurant.id),
        "restaurant_name": restaurant_name,
        "reject_reason_text": reservation.reject_reason_text,
        "open_path": f"/restaurant/{restaurant.id}",
    }
    return _persist_user_notification(
        db,
        recipient_id=customer.id,
        notification_type="reservation_rejected",
        title=title,
        message=message,
        metadata=metadata,
        push_title=title,
        push_body=detail,
    )


def notify_friend_request(
    db: Session,
    *,
    recipient: User,
    actor: User,
    request_id: UUID,
) -> UserNotification | None:
    if recipient.id == actor.id:
        return None
    actor_name = actor.nickname or "Gurme"
    title = f"@{actor_name} arkadaslik istegi gonderdi"
    message = "Profil → Arkadaslarim bolumunden kabul veya reddedebilirsiniz."
    metadata = {
        "actor_user_id": str(actor.id),
        "actor_nickname": actor_name,
        "friend_request_id": str(request_id),
        "open_path": "/(tabs)/profil",
    }
    return _persist_user_notification(
        db,
        recipient_id=recipient.id,
        notification_type="friend_request",
        title=title,
        message=message,
        metadata=metadata,
        push_title="Yeni arkadaslik istegi",
        push_body=f"@{actor_name} seni eklemek istiyor",
    )


def notify_friend_request_accepted(
    db: Session,
    *,
    recipient: User,
    actor: User,
    request_id: UUID,
) -> UserNotification | None:
    if recipient.id == actor.id:
        return None
    actor_name = actor.nickname or "Gurme"
    title = f"@{actor_name} isteginizi kabul etti"
    message = "Artik birbirinize ozel mesaj gonderebilirsiniz."
    metadata = {
        "actor_user_id": str(actor.id),
        "actor_nickname": actor_name,
        "friend_request_id": str(request_id),
        "open_path": "/(tabs)/profil",
    }
    return _persist_user_notification(
        db,
        recipient_id=recipient.id,
        notification_type="friend_request_accepted",
        title=title,
        message=message,
        metadata=metadata,
        push_title="Arkadaslik istegi kabul edildi",
        push_body=f"@{actor_name} artik arkadasin",
    )


def notify_remedy_offer_to_customer(
    db: Session,
    *,
    review: Review,
    offer: ReviewRemedyOffer,
    restaurant_name: str | None,
) -> UserNotification | None:
    if not review.author_id:
        return None
    place = restaurant_name or "İşletme"
    title = "Telafi teklifi"
    message = (
        f"{place} size %{offer.discount_percent} indirim teklif etti (kod: {offer.code}). "
        f"72 saat içinde yanıt vermezseniz yorumunuz otomatik yayınlanır. "
        f"Kabul ederseniz yorumunuz kamuya açık yayınlanmaz."
    )
    metadata = _review_notification_metadata(
        review,
        offer_id=str(offer.id),
        open_path="/remedy",
        coupon_code=offer.code,
    )
    return _persist_user_notification(
        db,
        recipient_id=review.author_id,
        notification_type="review_remedy_offer",
        title=title,
        message=message,
        metadata=metadata,
        push_title="Telafi teklifi geldi",
        push_body=f"{place} — %{offer.discount_percent} indirim",
    )


def notify_review_published_after_remedy(
    db: Session,
    *,
    review: Review,
    reason: str,
) -> UserNotification | None:
    if not review.author_id:
        return None
    if reason == "customer_rejected":
        message = "Kuponu kabul etmediğiniz için yorumunuz yayınlandı."
    elif reason == "customer_deadline":
        message = "72 saat içinde yanıt vermediğiniz için yorumunuz yayınlandı."
    else:
        message = "Restoran süresinde telafi sunmadığı için yorumunuz yayınlandı."
    metadata = _review_notification_metadata(review, remedy_reason=reason)
    return _persist_user_notification(
        db,
        recipient_id=review.author_id,
        notification_type="review_published",
        title="Yorumunuz yayınlandı",
        message=message,
        metadata=metadata,
        push_title="Yorumunuz yayında",
        push_body=message,
    )


def notify_review_resolved_remedy(
    db: Session,
    *,
    review: Review,
    offer: ReviewRemedyOffer,
) -> UserNotification | None:
    if not review.author_id:
        return None
    message = (
        f"Telafi teklifini kabul ettiniz; yorumunuz kamuya açık yayınlanmayacak. "
        f"Kupon kodunuz: {offer.code} (%{offer.discount_percent})"
    )
    metadata = _review_notification_metadata(review, offer_id=str(offer.id), coupon_code=offer.code)
    return _persist_user_notification(
        db,
        recipient_id=review.author_id,
        notification_type="review_remedy_accepted",
        title="Telafi kabul edildi",
        message=message,
        metadata=metadata,
        push_title="Kuponunuz hazır",
        push_body=f"Kod: {offer.code}",
    )

