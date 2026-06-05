"""Review social notification helpers."""

from uuid import uuid4
from unittest.mock import MagicMock

from app.services.user_notification_service import (
    _truncate_text,
    notify_review_helpful,
    notify_review_reply,
)


def test_truncate_text_short() -> None:
    assert _truncate_text("Merhaba") == "Merhaba"


def test_truncate_text_long() -> None:
    text = "a" * 150
    result = _truncate_text(text, max_len=120)
    assert len(result) == 120
    assert result.endswith("…")


def test_notify_review_reply_skips_when_author_is_actor() -> None:
    user_id = uuid4()
    review = MagicMock()
    review.author_id = user_id
    review.restaurant_id = uuid4()
    reply = MagicMock()
    reply.id = uuid4()
    reply.reply_text = "Tesekkurler"
    actor = MagicMock()
    actor.id = user_id

    db = MagicMock()
    assert notify_review_reply(db, review=review, reply=reply, actor=actor) is None
    db.add.assert_not_called()


def test_notify_review_helpful_skips_when_author_is_actor() -> None:
    user_id = uuid4()
    review = MagicMock()
    review.author_id = user_id
    review.restaurant_id = uuid4()
    actor = MagicMock()
    actor.id = user_id

    db = MagicMock()
    assert notify_review_helpful(db, review=review, actor=actor) is None
    db.add.assert_not_called()


def test_notify_review_reply_skips_without_author() -> None:
    review = MagicMock()
    review.author_id = None
    review.restaurant_id = uuid4()
    reply = MagicMock()
    reply.id = uuid4()
    reply.reply_text = "Cevap"
    actor = MagicMock()
    actor.id = uuid4()

    db = MagicMock()
    assert notify_review_reply(db, review=review, reply=reply, actor=actor) is None
    db.add.assert_not_called()
