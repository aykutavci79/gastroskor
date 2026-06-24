"""Kelime Sofrası ızgara koşu doğrulama testleri."""

from __future__ import annotations

from app.services.sofra_grid_runs import (
    audit_contiguous_runs,
    grid_matrix_to_map,
    placed_words_to_grid,
    validate_sofra_crossword,
    validate_stored_grid,
)


def _cell(r: int, c: int, letter: str, word_id: str) -> dict:
    return {"row": r, "col": c, "letter": letter, "wordIds": [word_id]}


def _staggered_words(count: int) -> list[dict]:
    base_words = ["ABLA", "ADAM", "AFET", "AGAC", "AKIL", "AKIN", "AKIM"]
    return [
        {
            "id": f"w{i}",
            "kelime": base_words[i],
            "ipucu": "test",
            "row": i,
            "col": i * 5,
            "direction": "h",
        }
        for i in range(count)
    ]


def test_validate_sofra_crossword_accepts_non_crossing_tdk_words():
    words = _staggered_words(5)
    ok, reason = validate_sofra_crossword(words)
    assert ok is True
    assert reason == "ok"


def test_validate_sofra_crossword_rejects_phantom_run():
    """TDK'da olmayan bitişik koşu — yanlış çapraz yerleşim."""
    words = [
        {"id": "w-bal", "kelime": "BAL", "row": 0, "col": 0, "direction": "h"},
        {"id": "w-lik", "kelime": "LIK", "row": 0, "col": 2, "direction": "h"},
    ]
    ok, reason = validate_sofra_crossword(words)
    assert ok is False
    assert reason.startswith("invalid_grid_run:")


def test_validate_sofra_crossword_skips_orphan_audit_without_lexicon(monkeypatch):
    """Backend image does not ship mobile lexicon; imported TS-validated grids should not false-fail."""
    import app.services.sofra_grid_runs as grid_runs

    monkeypatch.setattr(grid_runs, "_load_lexicon", lambda: (frozenset(), frozenset(), {}))
    words = [
        {"id": "w-bal", "kelime": "BAL", "row": 0, "col": 0, "direction": "h"},
        {"id": "w-lik", "kelime": "LIK", "row": 0, "col": 2, "direction": "h"},
    ]
    ok, reason = grid_runs.validate_sofra_crossword(words)
    assert ok is True
    assert reason == "ok"


def test_audit_rejects_aaşik_in_stored_grid():
    """Kayıtlı grid'de TDK dışı koşu yakalanır."""
    grid = [
        [
            _cell(0, 0, "A", "w1"),
            _cell(0, 1, "A", "w1"),
            _cell(0, 2, "Ş", "w1"),
            _cell(0, 3, "I", "w1"),
            _cell(0, 4, "K", "w1"),
        ],
    ]
    targets = frozenset({"BAŞLIK"})
    ok, invalid = audit_contiguous_runs(grid_matrix_to_map(grid), targets)
    assert ok is False
    assert any("AAŞIK" in item or item == "AAŞIK" for item in invalid)


def test_validate_stored_grid_matches_words():
    words = _staggered_words(5)
    grid: list[list[dict | None]] = [[None] * 24 for _ in range(5)]
    for w in words:
        kelime = w["kelime"]
        for i, ch in enumerate(kelime):
            r = w["row"]
            c = w["col"] + i
            grid[r][c] = _cell(r, c, ch, w["id"])
    puzzle = {"words": words, "grid": grid}
    ok, reason = validate_stored_grid(puzzle)
    assert ok is True
    assert reason == "ok"


def test_placed_words_to_grid_collision():
    words = [
        {"id": "w1", "kelime": "AT", "row": 0, "col": 0, "direction": "h"},
        {"id": "w2", "kelime": "EL", "row": 0, "col": 0, "direction": "v"},
    ]
    try:
        placed_words_to_grid(words)
        assert False, "expected collision"
    except ValueError:
        pass
