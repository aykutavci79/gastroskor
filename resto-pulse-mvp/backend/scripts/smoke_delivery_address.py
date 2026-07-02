"""Tradres + DB baglantisi smoke — backend klasorunden: py scripts/smoke_delivery_address.py"""

from __future__ import annotations

import sys
from pathlib import Path

# `py scripts/...` PYTHONPATH icermez; backend kokunu ekle.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings
from app.integrations.tradres_client import fetch_tradres_children


def main() -> int:
    db = (settings.database_url or "").strip()
    if "localhost" in db or "127.0.0.1" in db:
        print("UYARI: DATABASE_URL hala localhost — Railway URL .env'e yazildi mi?")
    else:
        print(f"DB host OK: ...{db.split('@')[-1][:50]}...")

    key = (settings.tradres_api_key or "").strip()
    print(f"TRADRES_API_KEY: {'var' if key else 'YOK'}")

    try:
        nodes = fetch_tradres_children(parent_id=int(settings.bursa_tradres_province_id))
    except Exception as exc:
        print(f"Tradres HATA: {exc}")
        return 1

    print(f"Bursa ilceleri ({len(nodes)} adet), ilk 5:")
    for node in nodes[:5]:
        print(f"  - {node.name} (id={node.id})")
    return 0 if nodes else 2


if __name__ == "__main__":
    sys.exit(main())
