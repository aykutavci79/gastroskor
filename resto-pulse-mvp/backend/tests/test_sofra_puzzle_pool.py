"""Kelime Sofrasi bulmaca havuzu servisi testleri."""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from app.services.sofra_puzzle_pool import (
    _emergency_puzzle_for_slot,
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


def test_emergency_puzzle_for_slot_is_valid_for_all_zorluklar():
    for zorluk in ("kolay", "orta", "zor"):
        puzzle = _emergency_puzzle_for_slot(f"2026-06-21:{zorluk}", zorluk)
        ok, reason = validate_puzzle_payload(puzzle, zorluk)
        assert ok is True
        assert reason == "ok"


def test_active_sofra_gun_id_before_reset():
    dt = datetime(2026, 6, 20, 10, 0, tzinfo=ZoneInfo("Europe/Istanbul"))
    assert active_sofra_gun_id(dt) == "2026-06-19"


def test_upcoming_sofra_gun_id():
    dt = datetime(2026, 6, 20, 16, 30, tzinfo=ZoneInfo("Europe/Istanbul"))
    assert upcoming_sofra_gun_id(dt) == "2026-06-20"


def test_find_fallback_source_scans_multiple_days():
    from unittest.mock import MagicMock

    from app.services.sofra_puzzle_pool import _find_fallback_source

    valid_puzzle = _sample_puzzle("orta")
    old_row = MagicMock()
    old_row.puzzle_data = valid_puzzle
    old_row.is_fallback = False
    old_row.gun_id = "2026-06-18"
    old_row.source_gun_id = None

    db = MagicMock()

    def scalar_side_effect(stmt):
        sql = str(stmt)
        if "distinct" in sql.lower():
            return 2
        if "order by" in sql.lower() and "limit" in sql.lower():
            return old_row
        return None

    scalar_result = MagicMock()
    scalar_result.all.return_value = [old_row]
    db.scalar = MagicMock(side_effect=scalar_side_effect)
    db.scalars = MagicMock(return_value=scalar_result)
    result = _find_fallback_source(db, "2026-06-23", "orta", 0)  # type: ignore[arg-type]
    assert result is not None
    prev, source_gun = result
    assert prev is old_row
    assert source_gun == "2026-06-18"


def test_find_fallback_source_skips_invalid_latest_row():
    from unittest.mock import MagicMock

    from app.services.sofra_puzzle_pool import _find_fallback_source

    invalid_row = MagicMock()
    invalid_row.puzzle_data = {"words": [], "wheel": [], "grid": []}
    invalid_row.is_fallback = False
    invalid_row.gun_id = "2026-06-22"
    invalid_row.source_gun_id = None

    valid_row = MagicMock()
    valid_row.puzzle_data = _sample_puzzle("orta")
    valid_row.is_fallback = False
    valid_row.gun_id = "2026-06-18"
    valid_row.source_gun_id = None

    db = MagicMock()
    db.scalar = MagicMock(return_value=None)
    scalar_result = MagicMock()
    scalar_result.all.return_value = [invalid_row, valid_row]
    db.scalars = MagicMock(return_value=scalar_result)

    result = _find_fallback_source(db, "2026-06-23", "orta", 0)  # type: ignore[arg-type]

    assert result is not None
    prev, source_gun = result
    assert prev is valid_row
    assert source_gun == "2026-06-18"
