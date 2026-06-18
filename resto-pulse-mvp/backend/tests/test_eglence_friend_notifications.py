from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from app.models.entities import User
from app.services.eglence_friend_notifications import (
    _actor_display_name,
    _build_copy,
    _format_elapsed_ms,
    notify_friends_eglence_activity,
)


def test_format_elapsed_ms():
    assert _format_elapsed_ms(192_000) == "3:12"
    assert _format_elapsed_ms(65_000) == "1:05"


def test_actor_display_name_prefers_nickname():
    user = User(email="a@test.com", nickname="AyseGurme")
    assert _actor_display_name(user) == "@AyseGurme"


def test_build_copy_sudoku():
    title, message, push_body, open_path = _build_copy(
        game="mini_sudoku",
        actor_label="@AyseGurme",
        elapsed_ms=192_000,
        score=None,
    )
    assert title == "Arkadaşın Sudoku çözdü"
    assert message == "@AyseGurme Mini Sudoku'yu 3:12 sürede çözdü."
    assert push_body == "Mini Sudoku · 3:12"
    assert open_path == "/oyun/mini-sudoku"


def test_build_copy_kelime():
    _, message, push_body, open_path = _build_copy(
        game="kelime_yarismasi",
        actor_label="Hasan",
        elapsed_ms=None,
        score=80,
    )
    assert message == "Hasan Kelime Yarışması'nda 80 puan yaptı."
    assert push_body == "Kelime Yarışması · 80 puan"
    assert open_path == "/oyun/kelime-yarismasi"


def test_notify_friends_sudoku(monkeypatch):
    actor = User(id=uuid4(), email="actor@test.com", nickname="AyseGurme")
    friend_id = uuid4()
    persisted: list[dict] = []

    monkeypatch.setattr(
        "app.services.eglence_friend_notifications._friend_user_ids",
        lambda db, user_id: [friend_id],
    )
    monkeypatch.setattr(
        "app.services.eglence_friend_notifications._already_notified_today",
        lambda *args, **kwargs: False,
    )

    def fake_persist(db, **kwargs):
        persisted.append(kwargs)
        return MagicMock()

    monkeypatch.setattr(
        "app.services.eglence_friend_notifications._persist_user_notification",
        fake_persist,
    )

    count = notify_friends_eglence_activity(
        MagicMock(),
        actor=actor,
        game="mini_sudoku",
        elapsed_ms=192_000,
        puzzle_id="2026-06-16",
    )
    assert count == 1
    assert persisted[0]["notification_type"] == "eglence_friend_activity"
    assert "@AyseGurme" in persisted[0]["message"]
    assert "3:12" in persisted[0]["message"]


def test_notify_friends_dedupe_same_day(monkeypatch):
    actor = User(id=uuid4(), email="actor@test.com", nickname="AyseGurme")
    friend_id = uuid4()
    calls = {"n": 0}

    monkeypatch.setattr(
        "app.services.eglence_friend_notifications._friend_user_ids",
        lambda db, user_id: [friend_id],
    )

    def already_notified(*args, **kwargs):
        calls["n"] += 1
        return calls["n"] > 1

    monkeypatch.setattr(
        "app.services.eglence_friend_notifications._already_notified_today",
        already_notified,
    )
    monkeypatch.setattr(
        "app.services.eglence_friend_notifications._persist_user_notification",
        lambda db, **kwargs: MagicMock(),
    )

    db = MagicMock()
    assert notify_friends_eglence_activity(db, actor=actor, game="kelime_yarismasi", score=80) == 1
    assert notify_friends_eglence_activity(db, actor=actor, game="kelime_yarismasi", score=90) == 0
