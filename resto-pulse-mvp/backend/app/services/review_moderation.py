from __future__ import annotations

from app.models.entities import User
from app.services.profanity_tr import (
    contains_prohibited_language,
    find_prohibited_highlights,
    normalize_review_text,
)

__all__ = [
    "ReviewModerationError",
    "contains_prohibited_language",
    "normalize_review_text",
    "find_prohibited_highlights",
    "check_review_text",
    "enforce_review_author_policy",
]

MODERATION_MESSAGE = (
    "Argo veya küfür içeren ifadeler var. İşaretli kelimeleri düzeltin; yorum yayınlanmaz."
)


class ReviewModerationError(Exception):
    def __init__(self, message: str, highlights: list[str]) -> None:
        super().__init__(message)
        self.message = message
        self.highlights = highlights


def check_review_text(review_text: str) -> ReviewModerationError | None:
    if not review_text.strip():
        return None
    highlights = find_prohibited_highlights(review_text)
    if highlights or contains_prohibited_language(review_text):
        return ReviewModerationError(MODERATION_MESSAGE, highlights)
    return None


def enforce_review_author_policy(_user: User, review_text: str) -> None:
    """Raises ReviewModerationError when text must not be published (no ban/strike)."""
    violation = check_review_text(review_text)
    if violation:
        raise violation
