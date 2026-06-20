"""Kelime Sofrası — mobil ile uyumlu Türkçe kelime normalizasyonu."""

from __future__ import annotations

import re

_SOFRA_ALLOWED = re.compile(r"[^A-ZÇĞİÖŞÜI]", re.UNICODE)

_TR_LOWER_TO_UPPER = str.maketrans(
    {
        "i": "İ",
        "ı": "I",
        "ş": "Ş",
        "ğ": "Ğ",
        "ü": "Ü",
        "ö": "Ö",
        "ç": "Ç",
    }
)


def sofra_kelime_buyuk(raw: str) -> str:
    text = (raw or "").strip().translate(_TR_LOWER_TO_UPPER).upper()
    return _SOFRA_ALLOWED.sub("", text)


def sofra_kelime_gecerli(raw: str) -> bool:
    kelime = sofra_kelime_buyuk(raw)
    return len(kelime) >= 3 and bool(re.fullmatch(r"[A-ZÇĞİÖŞÜI]+", kelime))
