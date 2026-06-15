from unittest.mock import MagicMock

from app.services.online_orders_discovery import _visit_avg_rating


def test_visit_avg_rating_falls_back_without_visit_filter():
    db = MagicMock()
    nested = MagicMock()
    nested.__enter__ = MagicMock(return_value=None)
    nested.__exit__ = MagicMock(return_value=False)
    db.begin_nested.return_value = nested

    call_count = {"n": 0}

    def scalar_side_effect(_stmt):
        call_count["n"] += 1
        if call_count["n"] == 1:
            raise RuntimeError("review_kind missing")
        return 4.2

    db.scalar.side_effect = scalar_side_effect

    assert _visit_avg_rating(db, "00000000-0000-0000-0000-000000000001") == 4.2
    assert db.begin_nested.call_count == 2
