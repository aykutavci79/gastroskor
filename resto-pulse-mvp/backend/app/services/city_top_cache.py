from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

CACHE_TTL_SECONDS = 24 * 60 * 60


def cache_dir() -> Path:
    root = Path(__file__).resolve().parents[2] / "data" / "city_top_cache"
    root.mkdir(parents=True, exist_ok=True)
    return root


def _cache_path(city_key: str) -> Path:
    safe = city_key.replace("/", "_").replace("\\", "_")
    return cache_dir() / f"{safe}.json"


def read_city_top_cache(city_key: str) -> dict | None:
    path = _cache_path(city_key)
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


def write_city_top_cache(city_key: str, city: str, items: list[dict]) -> dict:
    payload = {
        "city_key": city_key,
        "city": city,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "items": items,
    }
    path = _cache_path(city_key)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return payload
