#!/usr/bin/env python3
"""Kelime Sofrası günlük bulmaca havuzu — admin listesi / onay.

Kullanım:
  python scripts/sofra_bulmaca_admin.py liste
  python scripts/sofra_bulmaca_admin.py liste --gun 2026-06-20
  python scripts/sofra_bulmaca_admin.py onayla 2026-06-20 orta 0
  python scripts/sofra_bulmaca_admin.py isaretle 2026-06-20 zor 2

Ortam: DATABASE_URL (veya backend .env)
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.entities import SofraBulmacaReviewStatus
from app.services.sofra_puzzle_pool import list_puzzles, set_review_status


def _session() -> Session:
    engine = create_engine(settings.database_url)
    return Session(engine)


def cmd_liste(gun: str | None, limit: int) -> int:
    with _session() as db:
        rows, total = list_puzzles(db, gun_id=gun, limit=limit, offset=0)
    if not rows:
        print("Kayit bulunamadi.")
        return 0
    print(f"Toplam: {total} (gosterilen: {len(rows)})")
    print(
        f"{'GUN':<12} {'ZOR':<6} {'TUR':<4} {'KEL':<4} {'FB':<3} "
        f"{'MS':<6} {'DURUM':<14} KELIMELER"
    )
    print("-" * 96)
    for row in rows:
        puzzle = row.puzzle_data or {}
        words = puzzle.get("words") if isinstance(puzzle.get("words"), list) else []
        kelimeler = ", ".join(
            str(w.get("kelime", "")) for w in words if isinstance(w, dict)
        )[:48]
        fb = "Y" if row.is_fallback else "-"
        ms = str(row.generation_ms or "-")
        src = f" <-{row.source_gun_id}" if row.source_gun_id else ""
        print(
            f"{row.gun_id:<12} {row.zorluk:<6} {row.tur:<4} {len(words):<4} {fb:<3} "
            f"{ms:<6} {row.review_status.value:<14} {kelimeler}{src}"
        )
    return 0


def cmd_review(gun: str, zorluk: str, tur: int, action: str) -> int:
    status = (
        SofraBulmacaReviewStatus.approved
        if action == "onayla"
        else SofraBulmacaReviewStatus.flagged
    )
    with _session() as db:
        row = set_review_status(db, gun, zorluk, tur, status)
        if not row:
            print(f"Bulmaca bulunamadi: {gun}/{zorluk}/t{tur}")
            return 1
        db.commit()
    label = "Onaylandi" if action == "onayla" else "Isaretlendi"
    print(f"{label}: {row.puzzle_id} -> {row.review_status.value}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Kelime Sofrasi bulmaca havuzu admin")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_liste = sub.add_parser("liste", help="Uretilen bulmacalari listele")
    p_liste.add_argument("--gun", type=str, default=None)
    p_liste.add_argument("--limit", type=int, default=50)

    p_onay = sub.add_parser("onayla", help="Bulmacayi onayla")
    p_onay.add_argument("gun")
    p_onay.add_argument("zorluk", choices=["kolay", "orta", "zor"])
    p_onay.add_argument("tur", type=int)

    p_flag = sub.add_parser("isaretle", help="Sorunlu bulmacayi isaretle")
    p_flag.add_argument("gun")
    p_flag.add_argument("zorluk", choices=["kolay", "orta", "zor"])
    p_flag.add_argument("tur", type=int)

    args = parser.parse_args()
    if args.cmd == "liste":
        return cmd_liste(args.gun, args.limit)
    if args.cmd == "onayla":
        return cmd_review(args.gun, args.zorluk, args.tur, "onayla")
    if args.cmd == "isaretle":
        return cmd_review(args.gun, args.zorluk, args.tur, "isaretle")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
