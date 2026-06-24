"""Kelime Sofrası — ızgara koşu doğrulama (mobil grid-runs.ts ile uyumlu)."""

from __future__ import annotations

import json
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.core.config import BASE_DIR, settings

SOFRA_MIN_KELIME_UZUNLUGU = 3

GridCell = tuple[str, list[str]]  # letter, word_ids
GridMap = dict[tuple[int, int], GridCell]


def _mobile_root() -> Path:
    if settings.sofra_mobile_root:
        return Path(settings.sofra_mobile_root)
    return BASE_DIR.parent / "mobile"


def sofra_kelime_buyuk(raw: str) -> str:
    """Mobil sofraKelimeBuyuk — tr-TR büyük harf + NFC."""
    allowed = set("ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ")
    out: list[str] = []
    for ch in raw.strip():
        if ch == "i":
            out.append("İ")
        elif ch == "ı":
            out.append("I")
        elif ch in "öüçşğ":
            out.append(ch.upper())
        elif ch == "Ö":
            out.append("Ö")
        elif ch == "Ü":
            out.append("Ü")
        elif ch == "Ç":
            out.append("Ç")
        elif ch == "Ş":
            out.append("Ş")
        elif ch == "Ğ":
            out.append("Ğ")
        else:
            up = ch.upper()
            if up in allowed:
                out.append(up)
    return unicodedata.normalize("NFC", "".join(out))


def ascii_kelime_anahtar(raw: str) -> str:
    s = sofra_kelime_buyuk(raw)
    return (
        s.replace("İ", "I")
        .replace("Ş", "S")
        .replace("Ğ", "G")
        .replace("Ü", "U")
        .replace("Ö", "O")
        .replace("Ç", "C")
    )


@lru_cache(maxsize=1)
def _load_lexicon() -> tuple[frozenset[str], frozenset[str], dict[str, str]]:
    root = _mobile_root()
    full_path = root / "data" / "gastro-lexicon" / "lexicon-full.json"
    ascii_path = root / "data" / "gastro-lexicon" / "yazilis-by-ascii.json"
    if not full_path.is_file():
        return frozenset(), frozenset(), {}
    data = json.loads(full_path.read_text(encoding="utf-8"))
    words = data.get("words") or []
    canon = frozenset(sofra_kelime_buyuk(w) for w in words)
    ascii_set = frozenset(ascii_kelime_anahtar(w) for w in words)
    yazilis: dict[str, str] = {}
    if ascii_path.is_file():
        yazilis = json.loads(ascii_path.read_text(encoding="utf-8"))
    return canon, ascii_set, yazilis


def _lexicon_available() -> bool:
    canon, ascii_set, _ = _load_lexicon()
    return bool(canon or ascii_set)


def lexicon_has_kelime(kelime: str) -> bool:
    canon, ascii_set, yazilis = _load_lexicon()
    if not canon and not ascii_set:
        return True
    norm = sofra_kelime_buyuk(kelime)
    mapped = yazilis.get(ascii_kelime_anahtar(norm), norm)
    mapped = sofra_kelime_buyuk(mapped)
    if mapped in canon:
        return True
    return ascii_kelime_anahtar(mapped) in ascii_set


def _grid_bounds(grid: GridMap) -> tuple[int, int, int, int]:
    if not grid:
        return 0, 0, 0, 0
    rows = [r for r, _ in grid]
    cols = [c for _, c in grid]
    return min(rows), max(rows), min(cols), max(cols)


def _runs_in_line(letters: list[str | None]) -> list[str]:
    runs: list[str] = []
    buf = ""
    for ch in letters:
        if ch:
            buf += ch
        elif len(buf) >= 2:
            runs.append(buf)
            buf = ""
        else:
            buf = ""
    if len(buf) >= 2:
        runs.append(buf)
    return runs


def extract_grid_runs(grid: GridMap) -> list[str]:
    if not grid:
        return []
    min_row, max_row, min_col, max_col = _grid_bounds(grid)
    runs: list[str] = []
    for row in range(min_row, max_row + 1):
        line = [grid.get((row, col), (None, []))[0] for col in range(min_col, max_col + 1)]
        runs.extend(_runs_in_line(line))
    for col in range(min_col, max_col + 1):
        line = [grid.get((row, col), (None, []))[0] for row in range(min_row, max_row + 1)]
        runs.extend(_runs_in_line(line))
    return runs


def placed_words_to_grid(words: list[dict[str, Any]]) -> GridMap:
    grid: GridMap = {}
    for w in words:
        kelime = sofra_kelime_buyuk(str(w.get("kelime") or ""))
        direction = w.get("direction")
        row = w.get("row")
        col = w.get("col")
        word_id = str(w.get("id") or "")
        if direction not in ("h", "v") or not isinstance(row, int) or not isinstance(col, int):
            continue
        for i, letter in enumerate(kelime):
            r = row if direction == "h" else row + i
            c = col + i if direction == "h" else col
            existing = grid.get((r, c))
            if existing:
                if existing[0] != letter:
                    raise ValueError("Sofra grid çakışması")
                if word_id and word_id not in existing[1]:
                    existing[1].append(word_id)
            else:
                grid[(r, c)] = (letter, [word_id] if word_id else [])
    return grid


def grid_matrix_to_map(grid: list[Any]) -> GridMap:
    out: GridMap = {}
    if not isinstance(grid, list):
        return out
    for row_idx, row in enumerate(grid):
        if not isinstance(row, list):
            continue
        for col_idx, cell in enumerate(row):
            if not isinstance(cell, dict):
                continue
            letter = str(cell.get("letter") or "")
            if not letter:
                continue
            r = cell.get("row", row_idx)
            c = cell.get("col", col_idx)
            if not isinstance(r, int) or not isinstance(c, int):
                continue
            word_ids = [str(x) for x in (cell.get("wordIds") or []) if x]
            norm_letter = sofra_kelime_buyuk(letter)
            if len(norm_letter) != 1:
                continue
            out[(r, c)] = (norm_letter, word_ids)
    return out


def audit_contiguous_runs(
    grid: GridMap,
    target_words: frozenset[str],
    min_target_len: int = SOFRA_MIN_KELIME_UZUNLUGU,
) -> tuple[bool, list[str]]:
    """Bitişik 2+ harf koşusu TDK'da olmalı; 3+ hedef kelime değilse geçersiz."""
    invalid: list[str] = []
    lexicon_available = _lexicon_available()
    for run in extract_grid_runs(grid):
        if len(run) < 2:
            continue
        if not lexicon_available:
            continue
        norm = sofra_kelime_buyuk(run)
        if not lexicon_has_kelime(norm):
            invalid.append(norm)
            continue
        if len(norm) >= min_target_len and norm not in target_words:
            invalid.append(f"orphan:{norm}")
    return len(invalid) == 0, invalid


def validate_sofra_crossword(
    words: list[dict[str, Any]],
    min_word_len: int = SOFRA_MIN_KELIME_UZUNLUGU,
) -> tuple[bool, str]:
    if not words:
        return False, "empty_words"
    try:
        grid = placed_words_to_grid(words)
    except ValueError:
        return False, "grid_collision"
    targets = frozenset(sofra_kelime_buyuk(str(w.get("kelime") or "")) for w in words)
    ok, invalid = audit_contiguous_runs(grid, targets, min_word_len)
    if not ok:
        detail = invalid[0] if invalid else "invalid_run"
        return False, f"invalid_grid_run:{detail}"
    return True, "ok"


def validate_stored_grid(
    puzzle: dict[str, Any],
    min_word_len: int = SOFRA_MIN_KELIME_UZUNLUGU,
) -> tuple[bool, str]:
    """Kayıtlı grid JSON üzerinde koşu denetimi — words ile tutarlılık."""
    words = puzzle.get("words")
    if not isinstance(words, list):
        return False, "missing_words"
    targets = frozenset(sofra_kelime_buyuk(str(w.get("kelime") or "")) for w in words if isinstance(w, dict))
    grid_raw = puzzle.get("grid")
    if not isinstance(grid_raw, list) or not grid_raw:
        return False, "invalid_grid"
    grid = grid_matrix_to_map(grid_raw)
    ok, invalid = audit_contiguous_runs(grid, targets, min_word_len)
    if not ok:
        detail = invalid[0] if invalid else "invalid_run"
        return False, f"invalid_stored_grid:{detail}"
    return True, "ok"
