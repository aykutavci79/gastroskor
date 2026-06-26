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


def test_foodcast_upload_route_has_restaurant_model():
    from app.api.v1 import foodcast_routes

    assert foodcast_routes.Restaurant.__name__ == "Restaurant"


def test_foodcast_location_check_uses_db_for_proximity(monkeypatch):
    from app.services import foodcast

    db = object()
    restaurant = SimpleNamespace(latitude=40.1, longitude=29.1)
    captured = {}

    def fake_is_user_near_restaurant(db_arg, **kwargs):
        captured["db"] = db_arg
        captured["kwargs"] = kwargs
        return True, 12

    monkeypatch.setattr(foodcast, "is_user_near_restaurant", fake_is_user_near_restaurant)

    foodcast._assert_location_near_restaurant(
        db,
        restaurant,
        latitude=40.1001,
        longitude=29.1001,
    )

    assert captured["db"] is db
    assert captured["kwargs"]["restaurant"] is restaurant
