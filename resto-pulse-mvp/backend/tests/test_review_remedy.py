from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.services.review_remedy_service import (
    CUSTOMER_WINDOW_HOURS,
    RESTAURANT_WINDOW_HOURS,
    is_publication_visible,
    maybe_init_review_remedy,
    public_rating_filter,
)


class _FakeReview:
    def __init__(self, **kwargs):
        self.is_demo = kwargs.get("is_demo", False)
        self.source_platform = kwargs.get("source_platform", None)
        self.rating = kwargs.get("rating", 2)
        self.publication_status = kwargs.get("publication_status", "published")
        self.published_at = kwargs.get("published_at", None)
        self.remedy_restaurant_deadline_at = kwargs.get("remedy_restaurant_deadline_at", None)
        self.restaurant_id = kwargs.get("restaurant_id", uuid4())
        self.created_at = kwargs.get("created_at", datetime.now(timezone.utc))
        self.author_id = kwargs.get("author_id", uuid4())


class _FakeOwnership:
    pass


class _FakeDb:
    def scalar(self, _stmt):
        return _FakeOwnership()

    def add(self, _obj):
        return None


def test_maybe_init_sets_pending_for_low_rating_with_ownership() -> None:
    review = _FakeReview(rating=2)
    db = _FakeDb()
    assert maybe_init_review_remedy(db, review=review) is True
    assert review.publication_status == "pending_restaurant"
    assert review.remedy_restaurant_deadline_at is not None
    delta = review.remedy_restaurant_deadline_at - datetime.now(timezone.utc)
    assert timedelta(hours=RESTAURANT_WINDOW_HOURS - 1) < delta < timedelta(hours=RESTAURANT_WINDOW_HOURS + 1)


def test_maybe_init_publishes_high_rating_immediately() -> None:
    review = _FakeReview(rating=5)
    db = _FakeDb()
    assert maybe_init_review_remedy(db, review=review) is False
    assert review.publication_status == "published"
    assert review.published_at is not None


def test_visibility_rules() -> None:
    author = uuid4()
    published = _FakeReview(publication_status="published")
    pending = _FakeReview(publication_status="pending_restaurant", author_id=author)
    resolved = _FakeReview(publication_status="resolved", author_id=author)
    assert is_publication_visible(published) is True
    assert is_publication_visible(pending) is False
    assert is_publication_visible(pending, viewer_user_id=author) is True
    assert is_publication_visible(resolved) is False


def test_customer_window_constant() -> None:
    assert CUSTOMER_WINDOW_HOURS == 72
