from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.models.entities import User
from app.services.profanity_tr import contains_prohibited_language, normalize_review_text

__all__ = [
    "contains_prohibited_language",
    "normalize_review_text",
    "review_ban_message",
    "register_profanity_strike",
    "enforce_review_author_policy",
]


def review_ban_message(user: User, *, now: datetime | None = None) -> str | None:
    now = now or datetime.now(timezone.utc)
    banned_until = user.review_banned_until
    if not banned_until:
        return None
    if banned_until.tzinfo is None:
        banned_until = banned_until.replace(tzinfo=timezone.utc)
    if banned_until <= now:
        return None

    remaining = banned_until - now
    days = max(1, remaining.days)
    if days >= 30:
        return (
            f"Topluluk kurallari nedeniyle yorum yazma hakkiniz gecici olarak kapali. "
            f"Kalan sure: yaklasik {days} gun. "
            f"Saygin ve yapici dil kullanin."
        )
    return (
        f"Topluluk kurallari nedeniyle yorum yazma hakkiniz gecici olarak kapali. "
        f"Kalan sure: {days} gun. "
        f"Saygin ve yapici dil kullanin."
    )


def register_profanity_strike(user: User, *, now: datetime | None = None) -> str:
    now = now or datetime.now(timezone.utc)
    user.review_moderation_strikes = int(user.review_moderation_strikes or 0) + 1
    strikes = user.review_moderation_strikes

    if strikes == 1:
        return "Argo/küfür içeren yorumlar yayınlanamamaktadır."
    if strikes == 2:
        user.review_banned_until = now + timedelta(days=7)
        return (
            "Yorumunuz yayinlanmadi. Ikinci ihlal: 7 gun boyunca yorum yazamazsiniz. "
            "Lutfen yapici ve nazik bir dil kullanin."
        )

    user.review_banned_until = now + timedelta(days=90)
    return (
        "Yorumunuz yayinlanmadi. Tekrarlayan ihlal: 3 ay boyunca yorum yazamazsiniz. "
        "Topluluk kalitesini korumak icin bu adim zorunludur."
    )


def enforce_review_author_policy(user: User, review_text: str) -> None:
    """Raises ValueError with user-facing Turkish message when blocked."""
    ban = review_ban_message(user)
    if ban:
        raise ValueError(ban)

    if not review_text.strip():
        return

    if contains_prohibited_language(review_text):
        raise ValueError(register_profanity_strike(user))
