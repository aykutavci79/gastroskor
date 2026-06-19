"""TDK JSONL indeks — kelime-bulmaca tdk_kaynak.py ile uyumlu."""

from __future__ import annotations

import json
import logging
import re
import unicodedata
from functools import lru_cache
from pathlib import Path

from app.core.config import BASE_DIR, settings

logger = logging.getLogger(__name__)

_TDK_PATHS: tuple[Path, ...] = tuple(
    p
    for p in (
        Path(settings.sofra_tdk_json_path) if settings.sofra_tdk_json_path else None,
        BASE_DIR / "app" / "data" / "tdk.json",
        BASE_DIR.parent.parent / "kelime-bulmaca" / "data" / "kaynak" / "tdk.json",
        Path.home() / "Downloads" / "tdk.json",
    )
    if p is not None
)


def _normalize_kelime(text: str) -> str:
    t = unicodedata.normalize("NFD", text.strip().upper())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    for a, b in [
        ("İ", "I"),
        ("ı", "I"),
        ("Ş", "S"),
        ("ş", "S"),
        ("Ğ", "G"),
        ("ğ", "G"),
        ("Ü", "U"),
        ("ü", "U"),
        ("Ö", "O"),
        ("ö", "O"),
        ("Ç", "C"),
        ("ç", "C"),
    ]:
        t = t.replace(a, b)
    return re.sub(r"[^A-Z]", "", t)


def _tdk_dosya_bul() -> Path | None:
    for yol in _TDK_PATHS:
        if yol.is_file():
            return yol
    return None


def _gecerli_anlamlar(kayit: dict) -> list[str]:
    anlamlar = kayit.get("anlamlarListe") or []
    sirali = sorted(anlamlar, key=lambda a: int(a.get("anlam_sira") or 99))
    sonuc: list[str] = []
    for anlam_kaydi in sirali:
        metin = (anlam_kaydi.get("anlam") or "").strip()
        if not metin or metin.startswith("►"):
            continue
        sonuc.append(metin)
    return sonuc


def _gunluk_anlam(kayit: dict, max_uzunluk: int = 100, min_uzunluk: int = 12) -> str | None:
    anlamlar = _gecerli_anlamlar(kayit)
    if not anlamlar:
        return None
    ilk = anlamlar[0]
    if min_uzunluk <= len(ilk) <= max_uzunluk:
        return ilk
    uygun = [a for a in anlamlar if min_uzunluk <= len(a) <= max_uzunluk]
    return min(uygun, key=len) if uygun else None


@lru_cache(maxsize=1)
def tdk_indeks_yukle() -> dict[str, dict]:
    dosya = _tdk_dosya_bul()
    if not dosya:
        logger.warning("tdk.json bulunamadi — Sofra aday TDK dogrulamasi atlanacak.")
        return {}

    indeks: dict[str, dict] = {}
    with dosya.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                kayit = json.loads(line)
            except json.JSONDecodeError:
                continue
            madde = _normalize_kelime(str(kayit.get("madde") or ""))
            if not madde:
                continue
            indeks.setdefault(madde, kayit)
    logger.info("TDK indeks yuklendi: %s kayit (%s)", len(indeks), dosya)
    return indeks


def tdk_kelime_dogrula(kelime: str) -> tuple[bool, str | None]:
    indeks = tdk_indeks_yukle()
    if not indeks:
        return False, None
    key = _normalize_kelime(kelime)
    kayit = indeks.get(key)
    if not kayit:
        return False, None
    anlam = _gunluk_anlam(kayit) or (_gecerli_anlamlar(kayit)[0] if _gecerli_anlamlar(kayit) else None)
    if anlam and len(anlam) > 160:
        anlam = anlam[:160]
    return True, anlam
