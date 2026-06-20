#!/usr/bin/env python3
"""Kelime Sofrası havuz JSON import — lokal bootstrap / CI yardımcı.

Kullanım:
  npx tsx mobile/scripts/generate-sofra-pool.ts --gun-id 2026-06-20 > /tmp/pool.json
  python backend/scripts/import_sofra_pool_json.py --file /tmp/pool.json
  python backend/scripts/import_sofra_pool_json.py --file /tmp/pool.json --gun-id 2026-06-20

Ortam: DATABASE_URL (backend .env)
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.sofra_puzzle_pool import (
    EXPECTED_SLOTS_PER_DAY,
    generate_daily_puzzles,
    list_puzzles,
    upcoming_sofra_gun_id,
)


def _session() -> Session:
    engine = create_engine(settings.database_url)
    return Session(engine)


def main() -> int:
    parser = argparse.ArgumentParser(description="Sofra bulmaca havuzu JSON import")
    parser.add_argument("--file", type=Path, required=True, help="generate-sofra-pool.ts ciktisi")
    parser.add_argument("--gun-id", type=str, default=None)
    args = parser.parse_args()

    if not args.file.is_file():
        print(f"Dosya bulunamadi: {args.file}", file=sys.stderr)
        return 1

    with args.file.open(encoding="utf-8") as fh:
        puzzles = json.load(fh)
    if not isinstance(puzzles, list):
        print("JSON array bekleniyor", file=sys.stderr)
        return 1

    gun_id = args.gun_id or upcoming_sofra_gun_id()
    ok_count = sum(1 for p in puzzles if p.get("ok") is True)
    print(f"Import: gun_id={gun_id} ok_slots={ok_count}/{len(puzzles)}")

    with _session() as db:
        stats = generate_daily_puzzles(db, gun_id=gun_id, pregenerated=puzzles, cron_mode=True)
        db.commit()
        rows, total = list_puzzles(db, gun_id=gun_id, limit=20)

    print(f"Stats: generated={stats['generated']} fallback={stats['fallback']} failed={stats['failed']}")
    if stats["errors"]:
        for err in stats["errors"]:
            print(f"  ERROR: {err}")
    if stats.get("failed_slots"):
        print("Basarisiz slotlar:")
        for slot in stats["failed_slots"]:
            print(f"  - {slot['zorluk']} tur={slot['tur']} ({slot['puzzle_id']})")

    print(f"DB kayit: {total}/{EXPECTED_SLOTS_PER_DAY} slot")
    for row in rows:
        fb = "FB" if row.is_fallback else "  "
        print(f"  {row.zorluk:5} t{row.tur} {row.review_status.value:12} {fb} {row.puzzle_id}")

    if stats["failed"] > 0 or total < EXPECTED_SLOTS_PER_DAY:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
