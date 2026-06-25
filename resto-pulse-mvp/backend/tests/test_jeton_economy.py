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


def test_review_daily_limit_uses_user_day_idempotency(monkeypatch):
    from app.models.entities import JetonLedgerStatus
    from app.services import jeton_service

    user_id = uuid4()
    today = jeton_service.istanbul_today()
    keys: list[str] = []

    monkeypatch.setattr(jeton_service, "count_daily_earn_by_source_prefix", lambda *_a, **_k: 0)
    monkeypatch.setattr(jeton_service, "get_wallet_balance", lambda *_a, **_k: 5)

    def fake_post_ledger_entry(*_args, **kwargs):
        keys.append(kwargs["idempotency_key"])
        if len(keys) == 1:
            return SimpleNamespace(status=JetonLedgerStatus.posted)
        return None

    monkeypatch.setattr(jeton_service, "_post_ledger_entry", fake_post_ledger_entry)

    first = jeton_service.try_earn_review_submitted(
        SimpleNamespace(),  # type: ignore[arg-type]
        user_id=user_id,
        review_id=uuid4(),
    )
    second = jeton_service.try_earn_review_submitted(
        SimpleNamespace(),  # type: ignore[arg-type]
        user_id=user_id,
        review_id=uuid4(),
    )

    assert first.granted is True
    assert second.granted is False
    assert second.reason == "review_daily_limit"
    assert keys == [f"review_earn:{user_id}:{today.isoformat()}"] * 2


def test_spend_kelime_bul_free_play():
    from app.services.jeton_service import spend_game_play

    user_id = uuid4()
    wallet = SimpleNamespace(user_id=user_id, balance=10, updated_at=None)
    ledgers: list = []

    class _Db:
        def scalar(self, stmt):
            sql = str(stmt)
            if "count(" in sql.lower():
                return sum(
                    1
                    for entry in ledgers
                    if entry.idempotency_key.startswith(f"game_spend:{user_id}:kelime_bul:")
                )
            if "idempotency_key" in sql:
                for entry in ledgers:
                    if "game_spend:" in entry.idempotency_key:
                        return entry
                return None
            if "Wallet" in sql or "wallets" in sql.lower():
                return wallet
            return None

        def add(self, obj):
            if hasattr(obj, "idempotency_key"):
                obj.id = uuid4()
                ledgers.append(obj)

        def flush(self):
            return None

        def begin_nested(self):
            class _Ctx:
                def __enter__(self):
                    return self

                def __exit__(self, *args):
                    return False

            return _Ctx()

    db = _Db()
    first = spend_game_play(
        db,  # type: ignore[arg-type]
        user_id=user_id,
        game="kelime_bul",
        puzzle_id="1719234567890",
    )
    assert first.granted is True
    assert first.amount == 0
    assert first.plays_today == 1
    assert first.free_remaining == 2


def test_spend_kelime_bul_paid_after_free_quota():
    from app.models.entities import JetonLedger
    from app.services.jeton_service import kelime_bul_play_idempotency_key, spend_game_play

    user_id = uuid4()
    wallet = SimpleNamespace(user_id=user_id, balance=10, updated_at=None)
    ledger_by_key: dict[str, JetonLedger] = {}

    class _Db:
        def scalar(self, stmt):
            sql = str(stmt)
            if "count(" in sql.lower():
                return len(ledger_by_key)
            if "idempotency_key" in sql:
                for key, entry in ledger_by_key.items():
                    if key in sql:
                        return entry
                return None
            if "Wallet" in sql or "wallets" in sql.lower():
                return wallet
            return None

        def add(self, obj):
            if isinstance(obj, JetonLedger):
                obj.id = uuid4()
                ledger_by_key[obj.idempotency_key] = obj

        def flush(self):
            return None

        def begin_nested(self):
            class _Ctx:
                def __enter__(self):
                    return self

                def __exit__(self, *args):
                    return False

            return _Ctx()

    db = _Db()
    for i in range(3):
        puzzle_id = f"puzzle-{i}"
        result = spend_game_play(
            db,  # type: ignore[arg-type]
            user_id=user_id,
            game="kelime_bul",
            puzzle_id=puzzle_id,
        )
        assert result.granted is True
        assert result.amount == 0
        assert kelime_bul_play_idempotency_key(user_id=user_id, puzzle_id=puzzle_id) in ledger_by_key

    paid = spend_game_play(
        db,  # type: ignore[arg-type]
        user_id=user_id,
        game="kelime_bul",
        puzzle_id="puzzle-paid",
    )
    assert paid.granted is True
    assert paid.amount == -5
    assert wallet.balance == 5


def test_unlock_archive_day_active_is_free():
    from app.services.jeton_service import unlock_archive_day

    user_id = uuid4()

    class _Db:
        def scalar(self, *_a, **_k):
            return SimpleNamespace(balance=10)

    result = unlock_archive_day(
        _Db(),  # type: ignore[arg-type]
        user_id=user_id,
        game="kelime_sofrasi",
        gun_id="2026-06-25",
        active_gun_id="2026-06-25",
    )
    assert result.granted is True
    assert result.reason == "active_day_free"


def test_unlock_archive_day_charges_once():
    from app.models.entities import JetonLedger, JetonLedgerStatus
    from app.services.jeton_service import is_archive_day_unlocked, unlock_archive_day

    user_id = uuid4()
    wallet = SimpleNamespace(user_id=user_id, balance=20, updated_at=None)
    ledgers: list[JetonLedger] = []
    unlock_key = f"archive_unlock:{user_id}:kelime_sofrasi:2026-06-24"

    class _Db:
        def scalar(self, stmt):
            sql = str(stmt)
            if "idempotency_key" in sql:
                for entry in ledgers:
                    if entry.idempotency_key == unlock_key:
                        return entry.id
                return None
            if "Wallet" in sql or "wallets" in sql.lower():
                return wallet
            return None

        def add(self, obj):
            if isinstance(obj, JetonLedger):
                obj.id = uuid4()
                ledgers.append(obj)

        def flush(self):
            return None

        def begin_nested(self):
            class _Ctx:
                def __enter__(self):
                    return self

                def __exit__(self, *args):
                    return False

            return _Ctx()

    db = _Db()
    first = unlock_archive_day(
        db,  # type: ignore[arg-type]
        user_id=user_id,
        game="kelime_sofrasi",
        gun_id="2026-06-24",
        active_gun_id="2026-06-25",
    )
    assert first.granted is True
    assert first.amount == -15
    assert wallet.balance == 5

    second = unlock_archive_day(
        db,  # type: ignore[arg-type]
        user_id=user_id,
        game="kelime_sofrasi",
        gun_id="2026-06-24",
        active_gun_id="2026-06-25",
    )
    assert second.granted is True
    assert second.reason == "already_unlocked"
    assert is_archive_day_unlocked(db, user_id=user_id, game="kelime_sofrasi", gun_id="2026-06-24")  # type: ignore[arg-type]
