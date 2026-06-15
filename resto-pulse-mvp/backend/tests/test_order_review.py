"""Online siparis puanlama — lezzet/servis/kurye ayri kanal."""

from types import SimpleNamespace

import pytest

from app.models.entities import RestaurantOrderStatus
from app.services.order_review import OrderReviewError, create_order_review, order_can_be_reviewed


def test_order_can_be_reviewed_only_when_accepted():
    order = SimpleNamespace(status=RestaurantOrderStatus.accepted)
    assert order_can_be_reviewed(order) is True
    order.status = RestaurantOrderStatus.pending
    assert order_can_be_reviewed(order) is False
    order.status = RestaurantOrderStatus.rejected
    assert order_can_be_reviewed(order) is False


def test_create_order_review_rejects_invalid_score():
    order = SimpleNamespace(
        id="00000000-0000-0000-0000-000000000001",
        restaurant_id="00000000-0000-0000-0000-000000000002",
        user_id="00000000-0000-0000-0000-000000000003",
        status=RestaurantOrderStatus.accepted,
    )
    user = SimpleNamespace(id=order.user_id)
    db = SimpleNamespace(add=lambda *_a, **_k: None, flush=lambda: None)

    with pytest.raises(OrderReviewError):
        create_order_review(
            db,  # type: ignore[arg-type]
            order=order,  # type: ignore[arg-type]
            user=user,  # type: ignore[arg-type]
            lezzet=0,
            servis=4,
            kurye=5,
        )
