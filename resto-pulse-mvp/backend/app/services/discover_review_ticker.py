"""Keşfet şeridi — şehir bazlı 4+ GS yorum havuzu."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import Restaurant, Review
from app.services.display_name import normalize_author_name_display, public_author_name


def review_snippet(text: str, *, max_words: int = 5) -> str:
    cleaned = " ".join((text or "").split())
    if not cleaned:
        return ""
    words = cleaned.split(" ")
    if len(words) <= max_words:
        return cleaned
    return " ".join(words[:max_words]) + "…"


def list_discover_review_ticker(
    db: Session,
    *,
    city: str,
    min_rating: int = 4,
    limit: int = 20,
) -> list[dict]:
    min_rating = max(1, min(min_rating, 5))
    limit = max(1, min(limit, 40))

    rows = db.execute(
        select(Review, Restaurant.name)
        .join(Restaurant, Review.restaurant_id == Restaurant.id)
        .options(joinedload(Review.author))
        .where(
            Restaurant.city == city,
            Review.is_demo.is_(False),
            Review.source_platform.is_(None),
            Review.publication_status == "published",
            Review.rating >= min_rating,
            Review.review_text.is_not(None),
        )
        .order_by(Review.created_at.desc())
        .limit(limit * 3)
    ).all()

    items: list[dict] = []
    for review, restaurant_name in rows:
        text = (review.review_text or "").strip()
        if not text:
            continue
        snippet = review_snippet(text)
        if not snippet:
            continue
        author_name = review.author.full_name if review.author else None
        author_nickname = review.author.nickname if review.author else None
        display_mode = normalize_author_name_display(getattr(review, "author_name_display", None))
        author_label = public_author_name(author_name, display_mode, nickname=author_nickname)
        items.append(
            {
                "id": str(review.id),
                "restaurant_id": str(review.restaurant_id),
                "restaurant_name": restaurant_name or "Mekan",
                "rating": int(review.rating),
                "review_text": text,
                "snippet": snippet,
                "author_label": author_label,
            }
        )
        if len(items) >= limit:
            break
    return items
