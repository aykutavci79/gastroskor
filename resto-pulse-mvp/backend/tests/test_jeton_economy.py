"""Jeton ekonomisi — birim testler (SQLite tam sema gerektirmez)."""

from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

from app.constants.jeton import (
    JETON_FREE_HINTS_PER_GAME,
    JETON_HINT_COST,
    JETON_ORDER_MIN_TL,
)
from app.models.entities import RestaurantOrderStatus
from app.services.jeton_service import istanbul_today, spend_game_hint


def test_istanbul_today_returns_date():
    assert istanbul_today().year >= 2026


def test_order_minimum_tl_constant():
    assert JETON_ORDER_MIN_TL == Decimal("50")


def test_free_hint_indices():
    assert JETON_FREE_HINTS_PER_GAME == 2
    assert JETON_HINT_COST == 5


def test_spend_free_hint_without_wallet():
    """hint_index < 2 → ücret yok (mock session)."""

    class _Scalar:
        def __init__(self):
            self.wallet = None

        def scalar(self, *_a, **_k):
            return self.wallet

    session = _Scalar()
    user_id = uuid4()
    result = spend_game_hint(
        session,  # type: ignore[arg-type]
        user_id=user_id,
        game="kelime_sofrasi",
        puzzle_id="2026-06-18:kolay",
        hint_index=0,
    )
    assert result.granted is True
    assert result.amount == 0
    assert result.reason == "free_hint"


def test_order_not_accepted_skips_earn():
    from app.services.jeton_service import try_earn_order_accepted

    user = SimpleNamespace(id=uuid4(), first_order_bonus_claimed=True)
    order = SimpleNamespace(
        id=uuid4(),
        total_tl=Decimal("80"),
        status=RestaurantOrderStatus.pending,
        user=user,
    )

    class _Db:
        def scalar(self, *_a, **_k):
            return None

        def add(self, *_a, **_k):
            return None

        def flush(self):
            return None

    result = try_earn_order_accepted(_Db(), order=order, user=user)  # type: ignore[arg-type]
    assert result.granted is False
    assert result.reason == "order_not_accepted"


def test_review_daily_limit_blocks_second_earn():
    from app.services.jeton_service import try_earn_review_submitted

    user_id = uuid4()
    review_id = uuid4()

    class _Db:
        def __init__(self):
            self._count = 0

        def scalar(self, *_a, **_k):
            if self._count == 0:
                self._count += 1
                return 1
            return 0

        def add(self, *_a, **_k):
            return None

        def flush(self):
            return None

    db = _Db()
    result = try_earn_review_submitted(db, user_id=user_id, review_id=review_id)  # type: ignore[arg-type]
    assert result.granted is False
    assert result.reason == "review_daily_limit"
