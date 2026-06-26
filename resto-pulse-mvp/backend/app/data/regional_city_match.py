"""TÜRKPATENT ürün adı ↔ il eşleşmesi denetimi."""

from __future__ import annotations

import json
import re
import unicodedata
from functools import lru_cache
from pathlib import Path

_DATA_DIR = Path(__file__).resolve().parent
_PROVINCES_PATH = _DATA_DIR / "turkiye_provinces.json"

# Ürün adı önek kısaltmaları → resmi il adı
_PROVINCE_PREFIX_ALIASES: dict[str, str] = {
    "afyon": "Afyonkarahisar",
    "izmir": "İzmir",
    "istanbul": "İstanbul",
    "sanliurfa": "Şanlıurfa",
    "urfa": "Şanlıurfa",
}


@lru_cache(maxsize=1)
def province_records() -> tuple[dict, ...]:
    payload = json.loads(_PROVINCES_PATH.read_text(encoding="utf-8"))
    return tuple(payload["provinces"])


def _normalize_key(value: str) -> str:
    text = unicodedata.normalize("NFKD", value.strip())
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return (
        text.casefold()
        .replace("ı", "i")
        .replace("ğ", "g")
        .replace("ü", "u")
        .replace("ş", "s")
        .replace("ö", "o")
        .replace("ç", "c")
    )


@lru_cache(maxsize=1)
def _province_lookup() -> dict[str, dict]:
    lookup: dict[str, dict] = {}
    for row in province_records():
        name = str(row["name"])
        lookup[_normalize_key(name)] = row
        for token in name.split():
            if len(token) >= 3:
                lookup.setdefault(_normalize_key(token), row)
    for alias, canonical in _PROVINCE_PREFIX_ALIASES.items():
        target = lookup.get(_normalize_key(canonical))
        if target:
            lookup[alias] = target
    return lookup


def resolve_province_name(raw: str | None) -> dict | None:
    """Portal kartı / detay metninden il kaydı."""
    if not raw or not str(raw).strip():
        return None
    key = _normalize_key(str(raw))
    return _province_lookup().get(key)


def _name_province_prefix(name: str) -> dict | None:
    """Ürün adının başındaki il adını çıkar (Aydıntepe ≠ Aydın)."""
    text = name.strip()
    if not text:
        return None
    normalized_name = _normalize_key(text)
    candidates: list[tuple[int, dict]] = []
    for row in province_records():
        province = str(row["name"])
        province_key = _normalize_key(province)
        if normalized_name == province_key:
            candidates.append((len(province_key), row))
            continue
        prefix = f"{province_key} "
        if normalized_name.startswith(prefix):
            rest = normalized_name[len(prefix) :]
            # Aydıntepe gibi ilçe adları: "aydin " sonrası tepe... değil, tek parça kontrol
            if province_key == "aydin" and rest.startswith("tepe"):
                continue
            candidates.append((len(province_key), row))
    if not candidates:
        for alias, canonical in _PROVINCE_PREFIX_ALIASES.items():
            prefix = f"{alias} "
            if normalized_name.startswith(prefix) or normalized_name == alias:
                row = resolve_province_name(canonical)
                if row:
                    candidates.append((len(alias), row))
    if not candidates:
        return None
    candidates.sort(key=lambda pair: pair[0], reverse=True)
    return candidates[0][1]


def detect_city_mismatch(
    *,
    name: str,
    city: str,
    aliases: tuple[str, ...] | list[str] = (),
) -> dict | None:
    """Atanan il ile ürün adı uyuşmuyorsa beklenen ili döner."""
    assigned = resolve_province_name(city)
    if not assigned:
        return None
    assigned_key = _normalize_key(str(assigned["name"]))

    for label in (name, *aliases):
        inferred = _name_province_prefix(label)
        if not inferred:
            continue
        inferred_key = _normalize_key(str(inferred["name"]))
        if inferred_key != assigned_key:
            return {
                "assigned_city": str(assigned["name"]),
                "assigned_city_id": int(assigned["id"]),
                "expected_city": str(inferred["name"]),
                "expected_city_id": int(inferred["id"]),
                "matched_label": label.strip(),
            }
    return None


def city_mismatch_reason(mismatch: dict | None) -> str | None:
    if not mismatch:
        return None
    return (
        f"Ad '{mismatch['matched_label']}' → {mismatch['expected_city']}; "
        f"atanan il {mismatch['assigned_city']}"
    )
