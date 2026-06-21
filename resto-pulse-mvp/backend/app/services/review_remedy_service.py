from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.models import Restaurant, RestaurantOwnership, Review, ReviewRemedyOffer, User
from app.schemas.review_remedy import ReviewRemedyOfferCreate
from app.services.request_identity import resolve_authenticated_email

REMEDY_MAX_RATING = 3
RESTAURANT_WINDOW_HOURS = 24
CUSTOMER_WINDOW_HOURS = 72

ACCEPT_DISCLAIMER = (
    "Telafi teklifini kabul ederseniz, bu geri bildirim kamuya açık yorum olarak yayınlanmaz; "
    "konu işletme ile aranızda çözülmüş sayılır. "
    "Reddederseniz yorumunuz herkese açık olarak yayınlanır."
)
REJECT_PUBLISH_MESSAGE = "Kuponu kabul etmediğiniz için yorumunuz yayınlandı."
ACCEPT_RESOLVED_MESSAGE = "Telafi teklifini kabul ettiniz; yorumunuz kamuya açık yayınlanmayacak."
AUTO_PUBLISH_MESSAGE = "Süre dolduğu için yorumunuz yayınlandı."


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _generate_coupon_code(db: Session) -> str:
    for _ in range(8):
        code = f"GS-{secrets.token_hex(4).upper()}"
        exists = db.scalar(select(ReviewRemedyOffer.id).where(ReviewRemedyOffer.code == code))
        if not exists:
            return code
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Kupon kodu üretilemedi")


def is_publication_visible(review: Review, *, viewer_user_id: UUID | None = None) -> bool:
    status_value = review.publication_status or "published"
    if status_value == "published":
        return True
    if status_value == "resolved":
        return False
    return bool(viewer_user_id and review.author_id == viewer_user_id)


def eligible_for_remedy(review: Review, ownership: RestaurantOwnership | None) -> bool:
    if review.is_demo or review.source_platform is not None:
        return False
    if review.rating > REMEDY_MAX_RATING:
        return False
    if not ownership:
        return False
    return True


def maybe_init_review_remedy(db: Session, *, review: Review) -> bool:
    ownership = db.scalar(
        select(RestaurantOwnership).where(RestaurantOwnership.restaurant_id == review.restaurant_id).limit(1)
    )
    if not eligible_for_remedy(review, ownership):
        review.publication_status = "published"
        review.published_at = review.created_at or _utcnow()
        db.add(review)
        return False

    now = _utcnow()
    review.publication_status = "pending_restaurant"
    review.remedy_restaurant_deadline_at = now + timedelta(hours=RESTAURANT_WINDOW_HOURS)
    review.published_at = None
    db.add(review)
    return True


def publish_review(
    db: Session,
    review: Review,
    *,
    reason: str,
    offer: ReviewRemedyOffer | None = None,
) -> None:
    now = _utcnow()
    review.publication_status = "published"
    review.published_at = now
    review.remedy_restaurant_deadline_at = None
    db.add(review)
    if offer and offer.status == "pending":
        offer.status = "expired"
        offer.responded_at = now
        db.add(offer)


def resolve_review_accepted(db: Session, review: Review, offer: ReviewRemedyOffer) -> None:
    now = _utcnow()
    review.publication_status = "resolved"
    review.published_at = None
    review.remedy_restaurant_deadline_at = None
    offer.status = "accepted"
    offer.responded_at = now
    db.add(review)
    db.add(offer)


def get_ownership_for_user(db: Session, *, user_email: str, restaurant_id: UUID) -> RestaurantOwnership:
    email = user_email.strip().lower()
    ownership = db.scalar(
        select(RestaurantOwnership)
        .join(User, User.id == RestaurantOwnership.user_id)
        .where(User.email == email, RestaurantOwnership.restaurant_id == restaurant_id)
        .options(selectinload(RestaurantOwnership.restaurant))
        .limit(1)
    )
    if not ownership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu restoran için panel yetkiniz yok")
    return ownership


def issue_remedy_offer(
    db: Session,
    *,
    review_id: UUID,
    payload: ReviewRemedyOfferCreate,
) -> tuple[Review, ReviewRemedyOffer]:
    review = db.scalar(
        select(Review)
        .where(Review.id == review_id)
        .options(selectinload(Review.remedy_offer), selectinload(Review.restaurant))
        .limit(1)
    )
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Yorum bulunamadı")
    if review.publication_status != "pending_restaurant":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bu yorum için telafi teklifi sunulamaz")

    ownership = get_ownership_for_user(db, user_email=payload.user_email, restaurant_id=review.restaurant_id)
    now = _utcnow()
    if review.remedy_restaurant_deadline_at and review.remedy_restaurant_deadline_at < now:
        publish_review(db, review, reason="restaurant_deadline")
        db.commit()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="24 saatlik süre doldu; yorum yayınlandı")

    if not review.author_id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Yorum sahibi bulunamadı")

    coupon_expires = now + timedelta(days=payload.coupon_valid_days)
    offer = ReviewRemedyOffer(
        review_id=review.id,
        restaurant_id=review.restaurant_id,
        user_id=review.author_id,
        discount_percent=payload.discount_percent,
        code=_generate_coupon_code(db),
        coupon_expires_at=coupon_expires,
        offer_message=(payload.offer_message or "").strip() or None,
        status="pending",
        offered_at=now,
        customer_deadline_at=now + timedelta(hours=CUSTOMER_WINDOW_HOURS),
    )
    review.publication_status = "offer_pending"
    review.remedy_restaurant_deadline_at = None
    db.add(offer)
    db.add(review)
    db.flush()
    return review, offer


def accept_remedy_offer(db: Session, *, review_id: UUID, author_email: str) -> tuple[Review, ReviewRemedyOffer]:
    verified_email = resolve_authenticated_email(claimed_email=author_email)
    user = db.scalar(select(User).where(User.email == verified_email).limit(1))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kullanıcı bulunamadı")

    review = db.scalar(
        select(Review)
        .where(Review.id == review_id, Review.author_id == user.id)
        .options(selectinload(Review.remedy_offer))
        .limit(1)
    )
    if not review or review.publication_status != "offer_pending" or not review.remedy_offer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bekleyen telafi teklifi yok")

    offer = review.remedy_offer
    if offer.status != "pending":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Teklif zaten yanıtlanmış")
    if offer.customer_deadline_at < _utcnow():
        publish_review(db, review, reason="customer_deadline", offer=offer)
        db.commit()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="72 saatlik süre doldu; yorum yayınlandı")

    resolve_review_accepted(db, review, offer)
    db.flush()
    return review, offer


def reject_remedy_offer(db: Session, *, review_id: UUID, author_email: str) -> Review:
    verified_email = resolve_authenticated_email(claimed_email=author_email)
    user = db.scalar(select(User).where(User.email == verified_email).limit(1))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kullanıcı bulunamadı")

    review = db.scalar(
        select(Review)
        .where(Review.id == review_id, Review.author_id == user.id)
        .options(selectinload(Review.remedy_offer))
        .limit(1)
    )
    if not review or review.publication_status != "offer_pending" or not review.remedy_offer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bekleyen telafi teklifi yok")

    offer = review.remedy_offer
    now = _utcnow()
    offer.status = "rejected"
    offer.responded_at = now
    publish_review(db, review, reason="customer_rejected", offer=offer)
    db.flush()
    return review


def list_pending_remedy_for_panel(db: Session, *, user_email: str, limit: int = 50) -> list[Review]:
    email = user_email.strip().lower()
    rows = db.scalars(
        select(Review)
        .join(RestaurantOwnership, RestaurantOwnership.restaurant_id == Review.restaurant_id)
        .join(User, User.id == RestaurantOwnership.user_id)
        .where(
            User.email == email,
            Review.publication_status == "pending_restaurant",
            Review.source_platform.is_(None),
        )
        .options(selectinload(Review.restaurant), selectinload(Review.remedy_offer))
        .order_by(Review.remedy_restaurant_deadline_at.asc())
        .limit(max(1, min(limit, 200)))
    ).all()
    return list(rows)


def list_pending_remedy_for_user(db: Session, *, author_email: str, limit: int = 50) -> list[Review]:
    verified_email = resolve_authenticated_email(claimed_email=author_email)
    user = db.scalar(select(User).where(User.email == verified_email).limit(1))
    if not user:
        return []
    rows = db.scalars(
        select(Review)
        .where(
            Review.author_id == user.id,
            Review.publication_status == "offer_pending",
        )
        .options(
            selectinload(Review.restaurant),
            selectinload(Review.remedy_offer),
        )
        .order_by(Review.created_at.desc())
        .limit(max(1, min(limit, 200)))
    ).all()
    return list(rows)


def process_review_remedy_expirations(db: Session) -> dict[str, int]:
    from app.services.user_notification_service import notify_review_published_after_remedy

    now = _utcnow()
    stats = {"restaurant_expired": 0, "customer_expired": 0}

    restaurant_expired = db.scalars(
        select(Review)
        .where(
            Review.publication_status == "pending_restaurant",
            Review.remedy_restaurant_deadline_at.is_not(None),
            Review.remedy_restaurant_deadline_at < now,
        )
        .options(selectinload(Review.remedy_offer), selectinload(Review.author))
    ).all()
    for review in restaurant_expired:
        publish_review(db, review, reason="restaurant_deadline")
        notify_review_published_after_remedy(db, review=review, reason="restaurant_deadline")
        stats["restaurant_expired"] += 1

    customer_expired = db.scalars(
        select(Review)
        .join(ReviewRemedyOffer, ReviewRemedyOffer.review_id == Review.id)
        .where(
            Review.publication_status == "offer_pending",
            ReviewRemedyOffer.status == "pending",
            ReviewRemedyOffer.customer_deadline_at < now,
        )
        .options(selectinload(Review.remedy_offer), selectinload(Review.author))
    ).all()
    for review in customer_expired:
        publish_review(db, review, reason="customer_deadline", offer=review.remedy_offer)
        notify_review_published_after_remedy(db, review=review, reason="customer_deadline")
        stats["customer_expired"] += 1

    if stats["restaurant_expired"] or stats["customer_expired"]:
        db.commit()
    return stats


def public_reviews_filter(viewer_user_id: UUID | None = None):
    clauses = [Review.publication_status == "published"]
    if viewer_user_id:
        clauses.append(Review.author_id == viewer_user_id)
    return or_(*clauses)


def public_rating_filter():
    return Review.publication_status == "published"


def serialize_remedy_offer(offer: ReviewRemedyOffer) -> dict:
    return {
        "id": str(offer.id),
        "review_id": str(offer.review_id),
        "restaurant_id": str(offer.restaurant_id),
        "discount_percent": offer.discount_percent,
        "code": offer.code,
        "coupon_expires_at": offer.coupon_expires_at.isoformat(),
        "offer_message": offer.offer_message,
        "status": offer.status,
        "offered_at": offer.offered_at.isoformat(),
        "customer_deadline_at": offer.customer_deadline_at.isoformat(),
        "responded_at": offer.responded_at.isoformat() if offer.responded_at else None,
    }


def serialize_pending_remedy(review: Review) -> dict:
    restaurant_name = review.restaurant.name if review.restaurant else None
    offer = review.remedy_offer
    return {
        "review_id": str(review.id),
        "restaurant_id": str(review.restaurant_id),
        "restaurant_name": restaurant_name,
        "rating": review.rating,
        "review_text": review.review_text,
        "publication_status": review.publication_status,
        "remedy_restaurant_deadline_at": (
            review.remedy_restaurant_deadline_at.isoformat() if review.remedy_restaurant_deadline_at else None
        ),
        "offer": serialize_remedy_offer(offer) if offer else None,
        "accept_disclaimer": ACCEPT_DISCLAIMER,
        "reject_disclaimer": "Yorumumu herkese açık yayınla",
    }
