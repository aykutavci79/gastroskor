#!/usr/bin/env python3
"""Kelime Sofrası aday kelime admin — terminal rapor / onay / red.

Kullanım:
  python scripts/sofra_aday_admin.py rapor
  python scripts/sofra_aday_admin.py onayla TABAK
  python scripts/sofra_aday_admin.py reddet OCAK

Ortam: DATABASE_URL (veya backend .env)
"""

from __future__ import annotations

import argparse
import csv
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.entities import SofraKelimeAdayStatus
from app.services.sofra_kelime_learning import list_pending_adaylar, set_aday_status
from app.services.sofra_kelime_text import sofra_kelime_buyuk

DEFAULT_OVERRIDE_CSV = (
    BACKEND_ROOT.parent.parent / "kelime-bulmaca" / "data" / "kelime_onay_override.csv"
)


def _session() -> Session:
    engine = create_engine(settings.database_url)
    return Session(engine)


def cmd_rapor(limit: int) -> int:
    with _session() as db:
        rows = list_pending_adaylar(db, limit=limit)
    if not rows:
        print("Bekleyen aday kelime yok.")
        return 0
    print(f"{'SIRA':<5} {'KELIME':<16} {'DENEME':<8} {'TDK':<4} ANLAM")
    print("-" * 72)
    for i, row in enumerate(rows, start=1):
        anlam = (row.tdk_anlam_kisa or "")[:40].replace("\n", " ")
        print(
            f"{i:<5} {row.kelime:<16} {row.attempt_count:<8} "
            f"{'✓' if row.tdk_valid else '✗':<4} {anlam}"
        )
    return 0


def _append_override_csv(kelime: str, csv_path: Path) -> None:
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    existing: set[str] = set()
    if csv_path.is_file():
        with csv_path.open(encoding="utf-8", newline="") as fh:
            for row in csv.DictReader(fh):
                existing.add(sofra_kelime_buyuk(row.get("kelime", "")))
    if kelime in existing:
        return
    write_header = not csv_path.is_file() or csv_path.stat().st_size == 0
    with csv_path.open("a", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh)
        if write_header:
            writer.writerow(["kelime", "not", "tarih"])
        writer.writerow([kelime, "sofra_aday_admin", datetime.now(timezone.utc).date().isoformat()])


def cmd_onayla(kelime: str, override_csv: Path) -> int:
    norm = sofra_kelime_buyuk(kelime)
    with _session() as db:
        row = set_aday_status(db, norm, SofraKelimeAdayStatus.approved)
        if not row:
            print(f"Aday bulunamadi: {norm}")
            return 1
        db.commit()
    _append_override_csv(norm, override_csv)
    print(f"Onaylandi: {norm}")
    print(f"CSV'ye eklendi: {override_csv}")
    print("Sonraki adim: kelime_sofrasi_havuz.py ile havuz.json yeniden uret.")
    return 0


def cmd_reddet(kelime: str) -> int:
    norm = sofra_kelime_buyuk(kelime)
    with _session() as db:
        row = set_aday_status(db, norm, SofraKelimeAdayStatus.rejected)
        if not row:
            print(f"Aday bulunamadi: {norm}")
            return 1
        db.commit()
    print(f"Reddedildi: {norm}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Kelime Sofrası aday kelime admin")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_rapor = sub.add_parser("rapor", help="Bekleyen adaylari listele")
    p_rapor.add_argument("--limit", type=int, default=50)

    p_onay = sub.add_parser("onayla", help="Adayi onayla ve CSV'ye ekle")
    p_onay.add_argument("kelime")
    p_onay.add_argument("--csv", type=Path, default=DEFAULT_OVERRIDE_CSV)

    p_red = sub.add_parser("reddet", help="Adayi reddet")
    p_red.add_argument("kelime")

    args = parser.parse_args()
    if args.cmd == "rapor":
        return cmd_rapor(args.limit)
    if args.cmd == "onayla":
        return cmd_onayla(args.kelime, args.csv)
    if args.cmd == "reddet":
        return cmd_reddet(args.kelime)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
