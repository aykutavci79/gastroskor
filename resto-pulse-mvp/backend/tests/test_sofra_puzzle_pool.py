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


def _compile_grid(words: list[dict]) -> list[list[dict | None]]:
    max_row = 0
    max_col = 0
    for w in words:
        kelime = str(w["kelime"])
        if w["direction"] == "h":
            max_row = max(max_row, int(w["row"]))
            max_col = max(max_col, int(w["col"]) + len(kelime) - 1)
        else:
            max_row = max(max_row, int(w["row"]) + len(kelime) - 1)
            max_col = max(max_col, int(w["col"]))
    rows = max_row + 1
    cols = max_col + 1
    grid: list[list[dict | None]] = [[None] * cols for _ in range(rows)]
    for w in words:
        kelime = str(w["kelime"])
        for i, ch in enumerate(kelime):
            r = int(w["row"]) if w["direction"] == "h" else int(w["row"]) + i
            c = int(w["col"]) + i if w["direction"] == "h" else int(w["col"])
            grid[r][c] = {
                "row": r,
                "col": c,
                "letter": ch,
                "wordIds": [w["id"]],
            }
    return grid


def _sample_puzzle(zorluk: str = "orta") -> dict:
    counts = {"kolay": 5, "orta": 6, "zor": 6}
    hedef = counts[zorluk]
    base_words = ["ABLA", "ADAM", "AFET", "AGAC", "AKIL", "AKIN", "AKIM"]
    words = [
        {
            "id": f"w{i}",
            "kelime": base_words[i],
            "ipucu": "test",
            "row": i,
            "col": i * 5,
            "direction": "h",
        }
        for i in range(hedef)
    ]
    grid = _compile_grid(words)
    return {
        "id": "2026-06-20:orta",
        "zorluk": zorluk,
        "words": words,
        "bonusKelimeler": [],
        "wheel": ["A", "B", "C", "D", "E"],
        "rows": len(grid),
        "cols": len(grid[0]) if grid else 0,
        "grid": grid,
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


def test_validate_puzzle_payload_rejects_zor_seven_words():
    puzzle = _sample_puzzle("zor")
    puzzle["words"].append(
        {
            "id": "w-extra",
            "kelime": "AKIM",
            "ipucu": "test",
            "row": 6,
            "col": 30,
            "direction": "h",
        }
    )
    ok, reason = validate_puzzle_payload(puzzle, "zor")
    assert ok is False
    assert "word_count=7" in reason


def test_validate_puzzle_payload_accepts_zor_five_words():
    puzzle = _sample_puzzle("zor")
    puzzle["words"] = puzzle["words"][:5]
    puzzle["grid"] = _compile_grid(puzzle["words"])
    ok, reason = validate_puzzle_payload(puzzle, "zor")
    assert ok is True
    puzzle = _sample_puzzle("kolay")
    puzzle["words"] = [
        {
            "id": "w-gelin",
            "kelime": "GELİN",
            "row": 0,
            "col": 0,
            "direction": "v",
        },
        {
            "id": "w-gel",
            "kelime": "GEL",
            "row": 2,
            "col": 2,
            "direction": "v",
        },
        {
            "id": "w-yel",
            "kelime": "YEL",
            "row": 0,
            "col": 3,
            "direction": "h",
        },
        {
            "id": "w-ine",
            "kelime": "INE",
            "row": 1,
            "col": 3,
            "direction": "h",
        },
        {
            "id": "w-abc",
            "kelime": "ABC",
            "row": 2,
            "col": 5,
            "direction": "h",
        },
    ]
    ok, reason = validate_puzzle_payload(puzzle, "kolay")
    assert ok is False
    assert reason == "partial_word_pair"


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
