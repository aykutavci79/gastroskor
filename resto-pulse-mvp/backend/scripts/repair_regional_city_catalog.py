#!/usr/bin/env python3
"""Katalogdaki yanlış il atamalarını ürün adına göre düzeltir."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.data.regional_city_match import detect_city_mismatch  # noqa: E402

CATALOG = ROOT / "app" / "data" / "turkiye_geo_products.json"


def main() -> int:
    payload = json.loads(CATALOG.read_text(encoding="utf-8"))
    items = payload.get("items") or []
    fixed = 0
    for item in items:
        mismatch = detect_city_mismatch(
            name=str(item.get("name") or ""),
            city=str(item.get("city") or ""),
            aliases=item.get("aliases") or [],
        )
        if not mismatch:
            continue
        item["city"] = mismatch["expected_city"]
        item["city_id"] = mismatch["expected_city_id"]
        item["region"] = mismatch["expected_city"]
        item["portal_city"] = mismatch["expected_city"]
        fixed += 1
        print(f"fix: {item['slug']} -> {mismatch['expected_city']}")

    CATALOG.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\n{fixed} kayit duzeltildi -> {CATALOG}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
