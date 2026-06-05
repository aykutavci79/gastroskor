#!/usr/bin/env python3
"""TÜRKPATENT Bursa yemek katalogunu tarayıcı ile senkronize eder.

Site bot korumasi (TSPD) nedeniyle duz HTTP istegi calismaz; Playwright gerekir.

Kullanim:
  pip install playwright
  playwright install chromium
  python backend/scripts/sync_bursa_geo_products.py
"""

from __future__ import annotations

import json
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = ROOT / "app" / "data" / "bursa_geo_products.json"

CITY_ID = "16"
FOOD_GROUP_IDS = {
    "51": "Yemekler ve çorbalar",
    "54": "Fırıncılık ve pastacılık mamulleri, hamur işleri, tatlılar",
}
BASE = "https://ci.turkpatent.gov.tr"

# Mevcut ozet metinleri korunur; yeni urunler icin bos birakilir.
SUMMARY_BY_SLUG = {
    "bursa-cantik": "Bursa'nın geleneksel peynirli hamur işi lezzeti.",
    "bursa-cevizli-lokum": "Bursa'da üretilen cevizli lokum.",
    "bursa-sut-helvasi": "Bursa fırın ve pastanelerinde sunulan geleneksel süt helvası.",
    "bursa-tahinli-pide": "Bursa fırınlarında sabah kahvaltısının vazgeçilmezi tahinli pide.",
    "kemalpasa-tatlisi": "Şerbetli, yumuşak dokulu Kemalpaşa tatlısı.",
    "inegol-sutlu-kadayifi": "İnegöl yöresine özgü sütlü kadayıf tatlısı.",
    "bursa-doner-kebabi": "Meşe odununda pişirilen, tereyağlı domates soslu Bursa döner kebabı (İskender).",
    "bursa-pideli-kofte": "Bursa usulü pideli köfte.",
    "zeyniler-hinkali": "Zeyniler köyüne özgü geleneksel hınkalı.",
    "inegol-buryani": "İnegöl yöresine özgü büryanı (mişörizi).",
    "inegol-kofte": "İnegöl yöresine özgü ızgara köfte.",
    "inegol-piyazi": "İnegöl usulü piyaz.",
}


def slugify(name: str) -> str:
    text = name.strip().casefold()
    replacements = {
        "ı": "i",
        "ğ": "g",
        "ü": "u",
        "ş": "s",
        "ö": "o",
        "ç": "c",
        "/": " ",
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def scrape_group(page, group_id: str) -> list[dict]:
    url = f"{BASE}/cografi-isaretler/liste?il={CITY_ID}&tur=&urunGrubu={group_id}&adi="
    page.goto(url, wait_until="networkidle")
    script = """
    () => {
      const seen = new Set();
      const out = [];
      for (const a of document.querySelectorAll('a[href*="/cografi-isaretler/detay/"]')) {
        const href = a.href;
        const id = href.split('/').pop();
        if (seen.has(id)) continue;
        const name = a.innerText.trim();
        if (!name || name === 'Bursa') continue;
        seen.add(id);
        const card = a.closest('.product-item') || a.closest('.col-lg-3') || a.parentElement?.parentElement?.parentElement;
        const lis = card ? [...card.querySelectorAll('li')].map(li => li.innerText.trim()) : [];
        out.push({ id, name, href, meta: lis });
      }
      return out;
    }
    """
    rows = page.evaluate(script)
    items: list[dict] = []
    for row in rows:
        name = str(row["name"])
        slug = slugify(name.split("/")[0].strip())
        year_raw = row.get("meta", [None])[0]
        year = int(year_raw) if year_raw and str(year_raw).isdigit() else None
        indication = row.get("meta", [None, None])[1] or "Mahreç İşareti"
        aliases = [part.strip() for part in name.split("/") if part.strip() and part.strip() != name.split("/")[0].strip()]
        items.append(
            {
                "turkpatent_id": str(row["id"]),
                "slug": slug,
                "name": name.split("/")[0].strip(),
                "aliases": aliases,
                "city": "Bursa",
                "region": "Bursa",
                "summary": SUMMARY_BY_SLUG.get(slug, ""),
                "product_group_id": group_id,
                "registration_year": year,
                "indication_type": indication,
                "detail_url": str(row["href"]),
                "list_url": url,
            }
        )
    return items


def main() -> int:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("playwright kurulu degil: pip install playwright && playwright install chromium", file=sys.stderr)
        return 1

    items: list[dict] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page()
        for group_id in FOOD_GROUP_IDS:
            items.extend(scrape_group(page, group_id))
        browser.close()

    payload = {
        "scraped_at": date.today().isoformat(),
        "source_portal": f"{BASE}/",
        "city": "Bursa",
        "city_id": int(CITY_ID),
        "scope": "GastroSkor ic turizm — Bursa yemek ve firin/pastane urun gruplari",
        "product_groups": FOOD_GROUP_IDS,
        "items": items,
    }
    OUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(items)} products -> {OUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
