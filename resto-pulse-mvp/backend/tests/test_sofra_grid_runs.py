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


def test_audit_rejects_orphan_dictionary_run():
    grid = [
        [
            _cell(0, 0, "K", "w1"),
            _cell(0, 1, "A", "w2"),
            _cell(0, 2, "R", "w3"),
            _cell(0, 3, "A", "w4"),
        ],
    ]
    ok, invalid = audit_contiguous_runs(grid_matrix_to_map(grid), frozenset({"KAR"}))
    assert ok is False
    assert "orphan:KARA" in invalid


def test_audit_skips_orphan_classification_without_lexicon(monkeypatch):
    from app.services import sofra_grid_runs

    monkeypatch.setattr(sofra_grid_runs, "_load_lexicon", lambda: (frozenset(), frozenset(), {}))
    grid = [
        [
            _cell(0, 0, "N", "w1"),
            _cell(0, 1, "E", "w2"),
            _cell(0, 2, "T", "w3"),
        ],
    ]
    ok, invalid = sofra_grid_runs.audit_contiguous_runs(
        sofra_grid_runs.grid_matrix_to_map(grid),
        frozenset({"NE"}),
    )
    assert ok is True
    assert invalid == []


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
