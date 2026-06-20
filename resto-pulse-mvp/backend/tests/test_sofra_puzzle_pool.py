"""Kelime Sofrasi bulmaca havuzu servisi testleri."""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from app.services.sofra_puzzle_pool import (
    active_sofra_gun_id,
    clone_puzzle_for_slot,
    shift_gun_id,
    sofra_puzzle_key,
    upcoming_sofra_gun_id,
    validate_puzzle_payload,
)


def _sample_puzzle(zorluk: str = "orta") -> dict:
    hedef = {"kolay": 5, "orta": 6, "zor": 7}[zorluk]
    words = [
        {
            "id": f"w{i}",
            "kelime": f"KELIME{i}",
            "ipucu": "test",
            "row": 0,
            "col": i,
            "direction": "h",
        }
        for i in range(hedef)
    ]
    return {
        "id": "2026-06-20:orta",
        "zorluk": zorluk,
        "words": words,
        "bonusKelimeler": [],
        "wheel": ["A", "B", "C", "D", "E"],
        "rows": 1,
        "cols": hedef,
        "grid": [[{"row": 0, "col": 0, "letter": "A", "wordIds": ["w0"]}]],
    }


def test_sofra_puzzle_key_tur():
    assert sofra_puzzle_key("2026-06-20", "orta") == "2026-06-20:orta"
    assert sofra_puzzle_key("2026-06-20", "orta", 2) == "2026-06-20:orta:t2"


def test_shift_gun_id():
    assert shift_gun_id("2026-06-20", -1) == "2026-06-19"
    assert shift_gun_id("2026-06-01", -1) == "2026-05-31"


def test_validate_puzzle_payload_ok():
    ok, reason = validate_puzzle_payload(_sample_puzzle("orta"), "orta")
    assert ok is True
    assert reason == "ok"


def test_validate_puzzle_payload_rejects_fallback_ids():
    puzzle = _sample_puzzle("kolay")
    puzzle["words"][0]["id"] = "fb-h"
    ok, reason = validate_puzzle_payload(puzzle, "kolay")
    assert ok is False
    assert reason == "fallback_ids"


def test_clone_puzzle_for_slot():
    source = _sample_puzzle("orta")
    cloned = clone_puzzle_for_slot(source, "2026-06-21:orta:t1", "orta")
    assert cloned["id"] == "2026-06-21:orta:t1"
    assert cloned["words"] == source["words"]


def test_active_sofra_gun_id_before_reset():
    dt = datetime(2026, 6, 20, 10, 0, tzinfo=ZoneInfo("Europe/Istanbul"))
    assert active_sofra_gun_id(dt) == "2026-06-19"


def test_upcoming_sofra_gun_id():
    dt = datetime(2026, 6, 20, 16, 30, tzinfo=ZoneInfo("Europe/Istanbul"))
    assert upcoming_sofra_gun_id(dt) == "2026-06-20"
