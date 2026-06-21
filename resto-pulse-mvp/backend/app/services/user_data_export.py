"""KVKK veri tasınabilirliği — kullanıcı kişisel veri export paketi."""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    AppUsageEvent,
    DmMessage,
    DmThread,
    FoodcastPhoto,
    FriendRequest,
    GourmetChatAnswer,
    GourmetChatMessage,
    GourmetChatQuestion,
    JetonLedger,
    Referral,
    ReferralAttribution,
    RestaurantCheckIn,
    RestaurantOrder,
    Review,
    ReviewReply,
    User,
    UserEglenceResult,
    UserFriendship,
    UserNotification,
    UserRestaurantFollow,
    Wallet,
)
from app.services.restaurant_orders import order_to_dict

EXPORT_VERSION = "1.0"
DEFAULT_SECTION_LIMIT = 500
JETON_LEDGER_LIMIT = 1000


def _json_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, dict):
        return {str(k): _json_value(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_value(item) for item in value]
    return str(value)


def _section(items: list[Any], *, total: int, limit: int) -> dict[str, Any]:
    return {
        "total": total,
        "limit": limit,
        "truncated": total > len(items),
        "items": items,
    }


def _profile_payload(user: User) -> dict[str, Any]:
    return _json_value(
        {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "nickname": user.nickname,
            "avatar_url": user.avatar_url,
            "avatar_preset": user.avatar_preset,
            "google_sub": user.google_sub,
            "role": user.role,
            "order_phone_e164": user.order_phone_e164,
            "order_phone_verified_at": user.order_phone_verified_at,
            "kvkk_consent_at": user.kvkk_consent_at,
            "kvkk_consent_version": user.kvkk_consent_version,
            "default_review_name_display": user.default_review_name_display,
            "first_order_bonus_claimed": user.first_order_bonus_claimed,
            "created_at": user.created_at,
            "deleted_at": user.deleted_at,
        }
    )


def build_user_data_export(db: Session, *, user_id: UUID) -> dict[str, Any]:
    user = db.get(User, user_id)
    if user is None:
        raise ValueError("user_not_found")

    exported_at = datetime.now(timezone.utc)

    wallet = db.get(Wallet, user_id)
    wallet_payload = (
        _json_value({"balance": wallet.balance, "updated_at": wallet.updated_at}) if wallet else None
    )

    ledger_total = int(
        db.scalar(select(func.count(JetonLedger.id)).where(JetonLedger.user_id == user_id)) or 0
    )
    ledger_rows = db.scalars(
        select(JetonLedger)
        .where(JetonLedger.user_id == user_id)
        .order_by(JetonLedger.created_at.desc())
        .limit(JETON_LEDGER_LIMIT)
    ).all()
    ledger_items = [
        _json_value(
            {
                "id": row.id,
                "source": row.source,
                "source_id": row.source_id,
                "amount": row.amount,
                "status": row.status,
                "related_ledger_id": row.related_ledger_id,
                "created_at": row.created_at,
            }
        )
        for row in ledger_rows
    ]

    orders_total = int(
        db.scalar(select(func.count(RestaurantOrder.id)).where(RestaurantOrder.user_id == user_id)) or 0
    )
    order_rows = db.scalars(
        select(RestaurantOrder)
        .where(RestaurantOrder.user_id == user_id)
        .options(selectinload(RestaurantOrder.lines), selectinload(RestaurantOrder.restaurant))
        .order_by(RestaurantOrder.created_at.desc())
        .limit(DEFAULT_SECTION_LIMIT)
    ).all()
    order_items = [
        order_to_dict(row, restaurant_name=row.restaurant.name if row.restaurant else None)
        for row in order_rows
    ]

    reviews_total = int(
        db.scalar(select(func.count(Review.id)).where(Review.author_id == user_id)) or 0
    )
    review_rows = db.scalars(
        select(Review)
        .where(Review.author_id == user_id)
        .order_by(Review.created_at.desc())
        .limit(DEFAULT_SECTION_LIMIT)
    ).all()
    review_items = [
        _json_value(
            {
                "id": row.id,
                "restaurant_id": row.restaurant_id,
                "restaurant_order_id": row.restaurant_order_id,
                "review_kind": row.review_kind,
                "rating": row.rating,
                "review_text": row.review_text,
                "author_name_display": row.author_name_display,
                "publication_status": row.publication_status,
                "created_at": row.created_at,
                "updated_at": row.updated_at,
            }
        )
        for row in review_rows
    ]

    replies_total = int(
        db.scalar(select(func.count(ReviewReply.id)).where(ReviewReply.author_id == user_id)) or 0
    )
    reply_rows = db.scalars(
        select(ReviewReply)
        .where(ReviewReply.author_id == user_id)
        .order_by(ReviewReply.created_at.desc())
        .limit(DEFAULT_SECTION_LIMIT)
    ).all()
    reply_items = [
        _json_value(
            {
                "id": row.id,
                "review_id": row.review_id,
                "reply_text": row.reply_text,
                "created_at": row.created_at,
            }
        )
        for row in reply_rows
    ]

    friendships = db.scalars(
        select(UserFriendship).where(
            (UserFriendship.user_id == user_id) | (UserFriendship.friend_user_id == user_id)
        )
    ).all()
    friend_items = [
        _json_value(
            {
                "id": row.id,
                "user_id": row.user_id,
                "friend_user_id": row.friend_user_id,
                "created_at": row.created_at,
            }
        )
        for row in friendships
    ]

    friend_requests = db.scalars(
        select(FriendRequest).where(
            (FriendRequest.from_user_id == user_id) | (FriendRequest.to_user_id == user_id)
        )
    ).all()
    friend_request_items = [
        _json_value(
            {
                "id": row.id,
                "from_user_id": row.from_user_id,
                "to_user_id": row.to_user_id,
                "status": row.status,
                "created_at": row.created_at,
                "responded_at": row.responded_at,
            }
        )
        for row in friend_requests
    ]

    dm_threads = db.scalars(
        select(DmThread).where(
            (DmThread.user_low_id == user_id) | (DmThread.user_high_id == user_id)
        )
    ).all()
    dm_thread_items = [
        _json_value(
            {
                "id": row.id,
                "user_low_id": row.user_low_id,
                "user_high_id": row.user_high_id,
                "last_message_at": row.last_message_at,
                "created_at": row.created_at,
                "updated_at": row.updated_at,
            }
        )
        for row in dm_threads
    ]
    thread_ids = [row.id for row in dm_threads]
    dm_messages_total = 0
    dm_message_items: list[dict[str, Any]] = []
    if thread_ids:
        dm_messages_total = int(
            db.scalar(
                select(func.count(DmMessage.id)).where(DmMessage.thread_id.in_(thread_ids))
            )
            or 0
        )
        dm_rows = db.scalars(
            select(DmMessage)
            .where(DmMessage.thread_id.in_(thread_ids))
            .order_by(DmMessage.created_at.desc())
            .limit(DEFAULT_SECTION_LIMIT)
        ).all()
        dm_message_items = [
            _json_value(
                {
                    "id": row.id,
                    "thread_id": row.thread_id,
                    "sender_id": row.sender_id,
                    "body": row.body,
                    "created_at": row.created_at,
                }
            )
            for row in dm_rows
        ]

    follows_total = int(
        db.scalar(select(func.count(UserRestaurantFollow.id)).where(UserRestaurantFollow.user_id == user_id))
        or 0
    )
    follow_rows = db.scalars(
        select(UserRestaurantFollow)
        .where(UserRestaurantFollow.user_id == user_id)
        .order_by(UserRestaurantFollow.created_at.desc())
        .limit(DEFAULT_SECTION_LIMIT)
    ).all()
    follow_items = [
        _json_value(
            {
                "id": row.id,
                "restaurant_id": row.restaurant_id,
                "created_at": row.created_at,
            }
        )
        for row in follow_rows
    ]

    checkins_total = int(
        db.scalar(select(func.count(RestaurantCheckIn.id)).where(RestaurantCheckIn.user_id == user_id)) or 0
    )
    checkin_rows = db.scalars(
        select(RestaurantCheckIn)
        .where(RestaurantCheckIn.user_id == user_id)
        .order_by(RestaurantCheckIn.created_at.desc())
        .limit(DEFAULT_SECTION_LIMIT)
    ).all()
    checkin_items = [
        _json_value(
            {
                "id": row.id,
                "restaurant_id": row.restaurant_id,
                "check_in_date": row.check_in_date,
                "latitude": row.latitude,
                "longitude": row.longitude,
                "created_at": row.created_at,
            }
        )
        for row in checkin_rows
    ]

    notifications_total = int(
        db.scalar(select(func.count(UserNotification.id)).where(UserNotification.user_id == user_id)) or 0
    )
    notification_rows = db.scalars(
        select(UserNotification)
        .where(UserNotification.user_id == user_id)
        .order_by(UserNotification.created_at.desc())
        .limit(DEFAULT_SECTION_LIMIT)
    ).all()
    notification_items = [
        _json_value(
            {
                "id": row.id,
                "notification_type": row.notification_type,
                "title": row.title,
                "message": row.message,
                "metadata_json": row.metadata_json,
                "read_at": row.read_at,
                "created_at": row.created_at,
            }
        )
        for row in notification_rows
    ]

    foodcast_total = int(
        db.scalar(select(func.count(FoodcastPhoto.id)).where(FoodcastPhoto.author_id == user_id)) or 0
    )
    foodcast_rows = db.scalars(
        select(FoodcastPhoto)
        .where(FoodcastPhoto.author_id == user_id)
        .order_by(FoodcastPhoto.created_at.desc())
        .limit(DEFAULT_SECTION_LIMIT)
    ).all()
    foodcast_items = [
        _json_value(
            {
                "id": row.id,
                "dish_name": row.dish_name,
                "caption": row.caption,
                "image_url": row.image_url,
                "city": row.city,
                "latitude": row.latitude,
                "longitude": row.longitude,
                "created_at": row.created_at,
            }
        )
        for row in foodcast_rows
    ]

    eglence_total = int(
        db.scalar(select(func.count(UserEglenceResult.id)).where(UserEglenceResult.user_id == user_id)) or 0
    )
    eglence_rows = db.scalars(
        select(UserEglenceResult)
        .where(UserEglenceResult.user_id == user_id)
        .order_by(UserEglenceResult.updated_at.desc())
        .limit(DEFAULT_SECTION_LIMIT)
    ).all()
    eglence_items = [
        _json_value(
            {
                "id": row.id,
                "game": row.game,
                "period_key": row.period_key,
                "elapsed_ms": row.elapsed_ms,
                "score": row.score,
                "created_at": row.created_at,
                "updated_at": row.updated_at,
            }
        )
        for row in eglence_rows
    ]

    gourmet_questions_total = int(
        db.scalar(select(func.count(GourmetChatQuestion.id)).where(GourmetChatQuestion.author_id == user_id))
        or 0
    )
    gourmet_question_rows = db.scalars(
        select(GourmetChatQuestion)
        .where(GourmetChatQuestion.author_id == user_id)
        .order_by(GourmetChatQuestion.created_at.desc())
        .limit(DEFAULT_SECTION_LIMIT)
    ).all()
    gourmet_question_items = [
        _json_value(
            {
                "id": row.id,
                "room_id": row.room_id,
                "city": row.city,
                "tag": row.tag,
                "body": row.body,
                "answer_count": row.answer_count,
                "created_at": row.created_at,
            }
        )
        for row in gourmet_question_rows
    ]

    gourmet_answers_total = int(
        db.scalar(select(func.count(GourmetChatAnswer.id)).where(GourmetChatAnswer.author_id == user_id)) or 0
    )
    gourmet_answer_rows = db.scalars(
        select(GourmetChatAnswer)
        .where(GourmetChatAnswer.author_id == user_id)
        .order_by(GourmetChatAnswer.created_at.desc())
        .limit(DEFAULT_SECTION_LIMIT)
    ).all()
    gourmet_answer_items = [
        _json_value(
            {
                "id": row.id,
                "question_id": row.question_id,
                "body": row.body,
                "created_at": row.created_at,
            }
        )
        for row in gourmet_answer_rows
    ]

    gourmet_messages_total = int(
        db.scalar(select(func.count(GourmetChatMessage.id)).where(GourmetChatMessage.author_id == user_id))
        or 0
    )
    gourmet_message_rows = db.scalars(
        select(GourmetChatMessage)
        .where(GourmetChatMessage.author_id == user_id)
        .order_by(GourmetChatMessage.created_at.desc())
        .limit(DEFAULT_SECTION_LIMIT)
    ).all()
    gourmet_message_items = [
        _json_value(
            {
                "id": row.id,
                "room_id": row.room_id,
                "body": row.body,
                "mentions_json": row.mentions_json,
                "created_at": row.created_at,
            }
        )
        for row in gourmet_message_rows
    ]

    usage_total = int(
        db.scalar(select(func.count(AppUsageEvent.id)).where(AppUsageEvent.user_id == user_id)) or 0
    )
    usage_rows = db.scalars(
        select(AppUsageEvent)
        .where(AppUsageEvent.user_id == user_id)
        .order_by(AppUsageEvent.created_at.desc())
        .limit(DEFAULT_SECTION_LIMIT)
    ).all()
    usage_items = [
        _json_value(
            {
                "id": row.id,
                "event_type": row.event_type,
                "platform": row.platform,
                "session_id": row.session_id,
                "metadata_json": row.metadata_json,
                "created_at": row.created_at,
            }
        )
        for row in usage_rows
    ]

    referrals = db.scalars(
        select(Referral).where(
            (Referral.referrer_id == user_id) | (Referral.referred_id == user_id)
        )
    ).all()
    referral_items = [
        _json_value(
            {
                "id": row.id,
                "referrer_id": row.referrer_id,
                "referred_id": row.referred_id,
                "status": row.status,
                "device_hash": row.device_hash,
                "ip_at_signup": row.ip_at_signup,
                "created_at": row.created_at,
            }
        )
        for row in referrals
    ]

    attributions = db.scalars(
        select(ReferralAttribution).where(ReferralAttribution.referrer_id == user_id)
    ).all()

    return {
        "export_version": EXPORT_VERSION,
        "exported_at": _json_value(exported_at),
        "user_id": str(user_id),
        "profile": _profile_payload(user),
        "wallet": wallet_payload,
        "jeton_ledger": _section(ledger_items, total=ledger_total, limit=JETON_LEDGER_LIMIT),
        "orders": _section(order_items, total=orders_total, limit=DEFAULT_SECTION_LIMIT),
        "reviews": _section(review_items, total=reviews_total, limit=DEFAULT_SECTION_LIMIT),
        "review_replies": _section(reply_items, total=replies_total, limit=DEFAULT_SECTION_LIMIT),
        "friendships": {"total": len(friend_items), "items": friend_items},
        "friend_requests": {"total": len(friend_request_items), "items": friend_request_items},
        "dm_threads": {"total": len(dm_thread_items), "items": dm_thread_items},
        "dm_messages": _section(dm_message_items, total=dm_messages_total, limit=DEFAULT_SECTION_LIMIT),
        "restaurant_follows": _section(follow_items, total=follows_total, limit=DEFAULT_SECTION_LIMIT),
        "restaurant_check_ins": _section(checkin_items, total=checkins_total, limit=DEFAULT_SECTION_LIMIT),
        "notifications": _section(notification_items, total=notifications_total, limit=DEFAULT_SECTION_LIMIT),
        "foodcast_photos": _section(foodcast_items, total=foodcast_total, limit=DEFAULT_SECTION_LIMIT),
        "eglence_results": _section(eglence_items, total=eglence_total, limit=DEFAULT_SECTION_LIMIT),
        "gourmet_chat": {
            "questions": _section(
                gourmet_question_items, total=gourmet_questions_total, limit=DEFAULT_SECTION_LIMIT
            ),
            "answers": _section(gourmet_answer_items, total=gourmet_answers_total, limit=DEFAULT_SECTION_LIMIT),
            "messages": _section(
                gourmet_message_items, total=gourmet_messages_total, limit=DEFAULT_SECTION_LIMIT
            ),
        },
        "app_usage_events": _section(usage_items, total=usage_total, limit=DEFAULT_SECTION_LIMIT),
        "referrals": {"total": len(referral_items), "items": referral_items},
        "referral_attributions": [
            _json_value(
                {
                    "id": row.id,
                    "device_hash": row.device_hash,
                    "clicked_at": row.clicked_at,
                    "expires_at": row.expires_at,
                }
            )
            for row in attributions
        ],
        "notes": {
            "truncated_sections": "Bazi listeler performans icin sinirlidir; total alanina bakin.",
            "legal_basis": "KVKK madde 11 — veri tasınabilirligi",
        },
    }
