"""Online siparis puanlama — lezzet / servis / kurye ayri kanal."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.entities import (
    RestaurantOrder,
    RestaurantOrderStatus,
    Review,
    ReviewCategoryScore,
    ReviewKind,
    User,
)

ORDER_RATING_CATEGORIES = ("lezzet", "servis", "kurye")


class OrderReviewError(Exception):
    def __init__(self, message: str, *, code: str = "order_review") -> None:
        super().__init__(message)
        self.message = message
        self.code = code


def visit_review_filter():
    return or_(Review.review_kind == ReviewKind.visit, Review.review_kind.is_(None))


def online_order_review_filter():
    return Review.review_kind == ReviewKind.online_order


def get_review_for_order(db: Session, *, order_id: UUID) -> Review | None:
    return db.scalar(
        select(Review)
        .where(Review.restaurant_order_id == order_id)
        .options(selectinload(Review.category_scores))
        .limit(1)
    )


def order_can_be_reviewed(order: RestaurantOrder) -> bool:
    return order.status == RestaurantOrderStatus.accepted


def create_order_review(
    db: Session,
    *,
    order: RestaurantOrder,
    user: User,
    lezzet: int,
    servis: int,
    kurye: int,
    review_text: str = "",
    author_name_display: str = "full",
) -> Review:
    if order.user_id != user.id:
        raise OrderReviewError("Bu siparis size ait degil.", code="forbidden")
    if not order_can_be_reviewed(order):
        raise OrderReviewError("Yalnizca onaylanan siparisler puanlanabilir.", code="invalid_status")

    for label, value in (("lezzet", lezzet), ("servis", servis), ("kurye", kurye)):
        if value < 1 or value > 5:
            raise OrderReviewError(f"{label.capitalize()} puani 1-5 arasi olmali.")

    if get_review_for_order(db, order_id=order.id):
        raise OrderReviewError("Bu siparis zaten puanlandi.", code="already_reviewed")

    review = Review(
        restaurant_id=order.restaurant_id,
        author_id=user.id,
        review_kind=ReviewKind.online_order,
        restaurant_order_id=order.id,
        rating=int(lezzet),
        review_text=(review_text or "").strip(),
        review_lang="tr",
        is_demo=False,
        author_name_display=author_name_display,
    )
    db.add(review)
    db.flush()

    for category, value in (("lezzet", lezzet), ("servis", servis), ("kurye", kurye)):
        db.add(
            ReviewCategoryScore(
                review_id=review.id,
                category=category,
                score=float(value),
                label=None,
                reason=None,
            )
        )

    db.add(review)
    db.flush()
    return review


def batch_order_rating_summaries(db: Session, restaurant_ids: list[UUID]) -> dict[str, dict]:
    if not restaurant_ids:
        return {}

    lezzet_rows = db.execute(
        select(Review.restaurant_id, func.avg(Review.rating), func.count(Review.id))
        .where(
            Review.restaurant_id.in_(restaurant_ids),
            online_order_review_filter(),
        )
        .group_by(Review.restaurant_id)
    ).all()

    category_rows = db.execute(
        select(
            Review.restaurant_id,
            ReviewCategoryScore.category,
            func.avg(ReviewCategoryScore.score),
        )
        .join(ReviewCategoryScore, ReviewCategoryScore.review_id == Review.id)
        .where(
            Review.restaurant_id.in_(restaurant_ids),
            online_order_review_filter(),
            ReviewCategoryScore.category.in_(ORDER_RATING_CATEGORIES),
        )
        .group_by(Review.restaurant_id, ReviewCategoryScore.category)
    ).all()

    out: dict[str, dict] = {}
    for restaurant_id, lezzet_avg, count in lezzet_rows:
        key = str(restaurant_id)
        out[key] = {
            "lezzet_avg": round(float(lezzet_avg), 1) if lezzet_avg is not None else None,
            "servis_avg": None,
            "kurye_avg": None,
            "review_count": int(count or 0),
        }

    for restaurant_id, category, avg_score in category_rows:
        key = str(restaurant_id)
        bucket = out.setdefault(
            key,
            {"lezzet_avg": None, "servis_avg": None, "kurye_avg": None, "review_count": 0},
        )
        if avg_score is None:
            continue
        rounded = round(float(avg_score), 1)
        if category == "servis":
            bucket["servis_avg"] = rounded
        elif category == "kurye":
            bucket["kurye_avg"] = rounded
        elif category == "lezzet":
            bucket["lezzet_avg"] = rounded

    return out


def raise_order_review_http(exc: OrderReviewError) -> None:
    from fastapi import HTTPException, status

    code = status.HTTP_409_CONFLICT if exc.code == "already_reviewed" else status.HTTP_422_UNPROCESSABLE_ENTITY
    if exc.code == "forbidden":
        code = status.HTTP_403_FORBIDDEN
    raise HTTPException(status_code=code, detail={"code": exc.code, "message": exc.message}) from exc
