#!/usr/bin/env python3
"""TÜRKPATENT referans görsellerini indirir (TSPD icin Playwright)."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "app" / "data" / "bursa_geo_products.json"
REF_DIR = ROOT / "app" / "data" / "turkpatent_refs"
BASE = "https://ci.turkpatent.gov.tr"


def _ext_from_url(url: str) -> str:
    path = urlparse(url).path
    suffix = Path(path).suffix.lower()
    return suffix if suffix in {".jpg", ".jpeg", ".png", ".webp"} else ".jpg"


def scrape_image_urls(page, items: list[dict]) -> dict[str, str]:
    out: dict[str, str] = {}
    for item in items:
        slug = item["slug"]
        detail = item.get("detail_url") or f"{BASE}/cografi-isaretler/detay/{item['turkpatent_id']}"
        page.goto(detail, wait_until="networkidle", timeout=60000)
        image_url = page.evaluate(
            """() => {
              const img = document.querySelector('img[src*="/Pictures/GeographicalSigns/"]');
              return img?.src || null;
            }"""
        )
        if image_url:
            out[slug] = str(image_url)
            print(f"  {slug}: {image_url}")
        else:
            print(f"  {slug}: GORSEL YOK", file=sys.stderr)
    return out


def download_refs(page, mapping: dict[str, str]) -> None:
    REF_DIR.mkdir(parents=True, exist_ok=True)
    for slug, url in mapping.items():
        ext = _ext_from_url(url)
        dest = REF_DIR / f"{slug}{ext}"
        try:
            response = page.request.get(url, timeout=60000)
            if not response.ok:
                print(f"  indirilemedi {slug}: HTTP {response.status}", file=sys.stderr)
                continue
            dest.write_bytes(response.body())
            print(f"  kaydedildi -> {dest.name}")
        except Exception as exc:
            print(f"  hata {slug}: {exc}", file=sys.stderr)


def patch_catalog(mapping: dict[str, str]) -> None:
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    for item in data["items"]:
        ref = mapping.get(item["slug"])
        if ref:
            item["reference_image_url"] = ref
    CATALOG.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("playwright gerekli", file=sys.stderr)
        return 1

    items = json.loads(CATALOG.read_text(encoding="utf-8"))["items"]
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(ignore_https_errors=True)
        page = context.new_page()
        mapping = scrape_image_urls(page, items)
        download_refs(page, mapping)
        browser.close()

    patch_catalog(mapping)
    print(f"\n{len(mapping)} referans -> {REF_DIR}")
    return 0 if mapping else 1


if __name__ == "__main__":
    raise SystemExit(main())
