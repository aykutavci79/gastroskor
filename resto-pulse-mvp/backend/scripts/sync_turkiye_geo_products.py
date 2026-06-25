#!/usr/bin/env python3
"""Tüm iller — TÜRKPATENT yöresel lezzet + referans görselleri.

Site bot korumasi (TSPD) nedeniyle Playwright zorunlu.

Kullanim:
  pip install playwright
  playwright install chromium
  cd resto-pulse-mvp/backend
  python scripts/sync_turkiye_geo_products.py --download-images
  python scripts/sync_turkiye_geo_products.py --city-id 16 --download-images
  python scripts/sync_turkiye_geo_products.py --from-id 1 --to-id 81 --download-images

Cikti:
  app/data/turkiye_geo_products.json
  app/data/turkpatent_refs/*
  frontend/public/images/regional-flavors/*
  mobile/assets/regional-flavors/*
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from turkpatent_geo_common import (
    BASE,
    DEFAULT_PRODUCT_GROUP_IDS,
    download_image_bytes,
    ext_from_url,
    load_provinces,
    merge_items,
    resolve_image_url,
    scrape_group,
    write_image_copies,
)

ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = ROOT / "app" / "data" / "turkiye_geo_products.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="TÜRKPATENT Türkiye yöresel lezzet senkronu")
    parser.add_argument("--city-id", type=int, help="Tek il plaka / portal id (orn. 16=Bursa)")
    parser.add_argument("--from-id", type=int, default=1, help="Il araligi baslangic (plaka)")
    parser.add_argument("--to-id", type=int, default=81, help="Il araligi bitis (plaka)")
    parser.add_argument(
        "--download-images",
        action="store_true",
        help="Liste/detay gorsellerini indir (web + mobil + turkpatent_refs)",
    )
    parser.add_argument(
        "--skip-existing-images",
        action="store_true",
        help="Dosyasi olan slug icin gorsel indirmeyi atla",
    )
    parser.add_argument(
        "--group-id",
        action="append",
        dest="group_ids",
        help="Urun grubu (tekrarlanabilir). Varsayilan: 51,54,32,33",
    )
    return parser.parse_args()


def load_existing_items() -> list[dict]:
    if not OUT_PATH.exists():
        return []
    payload = json.loads(OUT_PATH.read_text(encoding="utf-8"))
    return list(payload.get("items") or [])


def save_payload(*, items: list[dict], group_map: dict[str, str], provinces_scraped: list[int]) -> None:
    payload = {
        "scraped_at": date.today().isoformat(),
        "source_portal": f"{BASE}/",
        "scope": "GastroSkor — Türkiye yöresel lezzet (TÜRKPATENT Coğrafi İşaretler Portalı)",
        "product_groups": group_map,
        "provinces_scraped": provinces_scraped,
        "province_count": len(provinces_scraped),
        "product_count": len(items),
        "image_policy": (
            "Görseller yalnızca TÜRKPATENT Coğrafi İşaretler Portalı referans görselleridir; "
            "başka kaynaktan alınmaz. Tescil bilgisi restoran onayı anlamına gelmez."
        ),
        "items": items,
    }
    OUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def image_exists(slug: str, url: str | None) -> bool:
    ext = ext_from_url(url or "")
    web_path = ROOT.parent / "frontend" / "public" / "images" / "regional-flavors" / f"{slug}{ext}"
    return web_path.exists()


def download_images_for_items(page, items: list[dict], *, skip_existing: bool) -> tuple[int, int]:
    ok = 0
    missing = 0
    for item in items:
        slug = item["slug"]
        if skip_existing and image_exists(slug, item.get("reference_image_url")):
            continue
        image_url = resolve_image_url(page, item)
        if not image_url:
            print(f"    GORSEL YOK: {slug}", file=sys.stderr)
            missing += 1
            continue
        item["reference_image_url"] = image_url
        item["image_url"] = f"/images/regional-flavors/{slug}{ext_from_url(image_url)}"
        body = download_image_bytes(page, image_url)
        if not body:
            print(f"    INDIRILEMEDI: {slug}", file=sys.stderr)
            missing += 1
            continue
        write_image_copies(slug, image_url, body)
        ok += 1
        print(f"    gorsel OK: {slug}")
    return ok, missing


def main() -> int:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("playwright kurulu degil: pip install playwright && playwright install chromium", file=sys.stderr)
        return 1

    args = parse_args()
    group_map = DEFAULT_PRODUCT_GROUP_IDS.copy()
    group_ids = args.group_ids or list(group_map.keys())

    provinces = load_provinces()
    if args.city_id:
        provinces = [p for p in provinces if int(p["id"]) == args.city_id]
        if not provinces:
            print(f"Il bulunamadi: {args.city_id}", file=sys.stderr)
            return 1
    else:
        provinces = [p for p in provinces if args.from_id <= int(p["id"]) <= args.to_id]

    existing = load_existing_items()
    used_slugs = {str(row["slug"]) for row in existing}
    prior_scraped_ids: set[int] = set()
    if OUT_PATH.exists():
        prior_scraped_ids = {int(x) for x in json.loads(OUT_PATH.read_text(encoding="utf-8")).get("provinces_scraped") or []}
    scraped_ids: list[int] = []
    batch_items: list[dict] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(
            ignore_https_errors=True,
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
            locale="tr-TR",
        )
        page = context.new_page()

        for province in provinces:
            city_id = int(province["id"])
            city_name = str(province["name"])
            print(f"\n== {city_name} ({city_id}) ==")
            scraped_ids.append(city_id)
            city_items: list[dict] = []
            for group_id in group_ids:
                label = group_map.get(group_id, group_id)
                print(f"  grup {group_id} ({label})...")
                try:
                    rows = scrape_group(
                        page,
                        city_id=city_id,
                        city_name=city_name,
                        group_id=group_id,
                        used_slugs=used_slugs,
                    )
                except Exception as exc:
                    print(f"    HATA: {exc}", file=sys.stderr)
                    continue
                print(f"    {len(rows)} urun")
                city_items.extend(rows)

            if args.download_images and city_items:
                print(f"  gorseller ({len(city_items)} urun)...")
                ok, missing = download_images_for_items(
                    page,
                    city_items,
                    skip_existing=args.skip_existing_images,
                )
                print(f"  gorsel ozet: {ok} ok, {missing} eksik")

            batch_items.extend(city_items)
            merged_so_far = merge_items(existing, batch_items)
            all_scraped_so_far = sorted(prior_scraped_ids | {int(x) for x in scraped_ids})
            save_payload(items=merged_so_far, group_map=group_map, provinces_scraped=all_scraped_so_far)
            print(f"  ara kayit: {len(merged_so_far)} urun")

        browser.close()

    merged = merge_items(existing, batch_items)
    all_scraped = sorted(prior_scraped_ids | {int(x) for x in scraped_ids})
    save_payload(items=merged, group_map=group_map, provinces_scraped=all_scraped)
    print(f"\nToplam {len(merged)} urun -> {OUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
