"""Turkce metin — sesli/yazili komut eslestirme icin ASCII yakinlastirma."""

from __future__ import annotations

import re

_NON_WORD = re.compile(r"[^\w\s]", re.UNICODE)


def normalize_tr_text(value: str) -> str:
    text = (value or "").strip().casefold()
    text = text.replace("’", "").replace("'", "")
    text = _NON_WORD.sub(" ", text)
    return " ".join(text.split())


def fold_tr_ascii(value: str) -> str:
    text = normalize_tr_text(value)
    return (
        text.replace("ı", "i")
        .replace("ğ", "g")
        .replace("ü", "u")
        .replace("ş", "s")
        .replace("ö", "o")
        .replace("ç", "c")
    )


def text_includes_tr_folded(haystack: str, needle: str, *, min_needle_len: int = 3) -> bool:
    folded_needle = fold_tr_ascii(needle)
    if len(folded_needle) < min_needle_len:
        return False
    return folded_needle in fold_tr_ascii(haystack)
