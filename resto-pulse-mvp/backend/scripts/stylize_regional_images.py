#!/usr/bin/env python3
"""Yoresel urun gorsel pipeline — olceklenebilir TurkPatent referans + stilize.

Akis (sehir basina tekrarlanir):
  1. sync_bursa_geo_products.py   — urun listesi + reference_image_url
  2. download_turkpatent_refs.py  — referans JPEG'leri app/data/turkpatent_refs/
  3. (Manuel veya otomasyon) AI img2img: referans %50-60 sadakat, isik/acı/ton degisimi
  4. Cikti -> frontend/public/images/regional-flavors/{slug}.jpg

Turkiye geneli: her il icin 1-2-3 adimlari ayni; prompt yazmaya gerek yok —
referans gorsel urunun ne oldugunu tanimlar.

Ornek img2img prompt sablonu:
  Recreate the EXACT same Turkish dish as the reference. Same food type, shape,
  ingredients, plating and composition. Keep ~55% fidelity. Only enhance: warmer
  side lighting, richer colors, ~20deg camera shift, appetizing look. No text/logos.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "app" / "data" / "bursa_geo_products.json"
REF_DIR = ROOT / "app" / "data" / "turkpatent_refs"
OUT_DIR = ROOT.parent / "frontend" / "public" / "images" / "regional-flavors"

PROMPT_TEMPLATE = (
    "Recreate the EXACT same Turkish dish as the reference image. "
    "Same food type, shape, ingredients, plating and composition. "
    "Keep 55% visual fidelity. Only subtle enhancements: warmer side lighting, "
    "slightly richer natural colors, shallow depth of field, minor 20-degree camera "
    "angle shift, more appetizing look. No text, logos, watermarks, no people."
)


def list_pending() -> list[dict]:
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    pending: list[dict] = []
    for item in data["items"]:
        slug = item["slug"]
        ref_url = item.get("reference_image_url")
        ref_files = list(REF_DIR.glob(f"{slug}.*"))
        out_file = OUT_DIR / f"{slug}.jpg"
        pending.append(
            {
                "slug": slug,
                "name": item["name"],
                "reference_url": ref_url,
                "reference_local": str(ref_files[0]) if ref_files else None,
                "output": str(out_file),
                "output_exists": out_file.is_file(),
            }
        )
    return pending


def main() -> int:
    rows = list_pending()
    print(PROMPT_TEMPLATE)
    print()
    for row in rows:
        status = "OK" if row["output_exists"] else "EKSIK"
        ref = "ref var" if row["reference_local"] else "ref yok"
        print(f"[{status}] {row['slug']} ({ref})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
