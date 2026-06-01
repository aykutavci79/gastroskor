"""Canli arama sonuclari — 24 saat dosya onbellegi (Google maliyetini dusurur)."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

CACHE_TTL_SECONDS = 24 * 60 * 60


def cache_dir() -> Path:
    root = Path(__file__).resolve().parents[2] / "data" / "place_search_cache"
    root.mkdir(parents=True, exist_ok=True)
    return root


def build_cache_key(*, city_key: str, query_key: str) -> str:
    raw = f"{city_key}|{query_key}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def read_place_search_cache(cache_key: str) -> dict | None:
    path = cache_dir() / f"{cache_key}.json"
    if not path.is_file():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    fetched_at = payload.get("fetched_at")
    if not fetched_at:
        return None
    try:
        ts = datetime.fromisoformat(fetched_at.replace("Z", "+00:00"))
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
    except ValueError:
        return None
    age = (datetime.now(timezone.utc) - ts.astimezone(timezone.utc)).total_seconds()
    if age > CACHE_TTL_SECONDS:
        return None
    return payload


def write_place_search_cache(cache_key: str, payload: dict) -> dict:
    payload = {**payload, "fetched_at": datetime.now(timezone.utc).isoformat(), "cache_key": cache_key}
    path = cache_dir() / f"{cache_key}.json"
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    return payload
