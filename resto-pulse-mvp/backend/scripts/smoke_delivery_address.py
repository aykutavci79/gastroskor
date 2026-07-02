"""Bursa adres seed smoke — py scripts/smoke_delivery_address.py"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import func, select

from app.db.session import SessionLocal
from app.models.entities import AddressNodeCache
from app.services.delivery_address import list_address_children


def main() -> int:
    with SessionLocal() as db:
        total = db.scalar(select(func.count()).select_from(AddressNodeCache)) or 0
        print(f"address_node_cache: {total} kayit")
        if total < 100:
            print("UYARI: Seed yok — py scripts/import_bursa_address_nodes.py --seed-only")
            return 1
        items = list_address_children(db, parent_id=16)
        print(f"Bursa ilceleri: {len(items)} — ornek: {[i['name'] for i in items[:3]]}")
    return 0 if items else 2


if __name__ == "__main__":
    raise SystemExit(main())
