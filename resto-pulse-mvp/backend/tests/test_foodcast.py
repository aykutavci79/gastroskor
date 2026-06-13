from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.services.foodcast import FoodcastError, author_label_for_user, list_foodcast_feed, report_foodcast_photo


def test_author_label_prefers_nickname():
    user = SimpleNamespace(
        nickname="Kebapci",
        full_name="Ali Veli",
        default_review_name_display="full",
    )
    assert author_label_for_user(user) == "Kebapci"


def test_report_invalid_reason_raises():
    from unittest.mock import MagicMock

    db = MagicMock()
    with pytest.raises(FoodcastError):
        report_foodcast_photo(
            db,
            photo_id=uuid4(),
            reason="bad_reason",
            note=None,
            reporter=None,
            reporter_email=None,
        )


def test_list_foodcast_feed_empty_db():
    from unittest.mock import MagicMock

    db = MagicMock()
    db.scalar.return_value = 0
    db.scalars.return_value.all.return_value = []
    payload = list_foodcast_feed(db, city="Bursa", limit=10)
    assert payload["items"] == []
    assert payload["total_visible"] == 0
