"""TÜRKPATENT Coğrafi İşaretler — ortak scrape yardımcıları."""

from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parent
DATA_DIR = ROOT / "app" / "data"
PROVINCES_PATH = DATA_DIR / "turkiye_provinces.json"
BASE = "https://ci.turkpatent.gov.tr"

# GastroSkor: yemek + firin/pastane + icecek (portal Nice siniflari)
DEFAULT_PRODUCT_GROUP_IDS = {
    "51": "Yemekler ve çorbalar",
    "54": "Fırıncılık ve pastacılık mamulleri, hamur işleri, tatlılar",
    "32": "Bira ve malt içecekleri",
    "33": "Alkolsüz içecekler",
}

LIST_SCRAPE_JS = """
() => {
  const seen = new Set();
  const out = [];
  for (const card of document.querySelectorAll('.box-two')) {
    const link = card.querySelector('a[href*="/cografi-isaretler/detay/"]');
    if (!link) continue;
    const href = link.href || link.getAttribute('href');
    if (!href) continue;
    const id = href.split('/').pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const name = (card.querySelector('.box-two-title h4') || card.querySelector('h4'))?.innerText?.trim();
    if (!name || name.length < 2) continue;
    const city = card.querySelector('.box-two-yil span')?.innerText?.trim() || '';
    const year = card.querySelector('.box-two-title ul li a')?.innerText?.trim() || '';
    const indication = card.querySelectorAll('.box-two-title ul li')[1]?.innerText?.trim() || '';
    const img = card.querySelector('img[src*="/Pictures/GeographicalSigns/"]');
    const absHref = href.startsWith('http') ? href : `https://ci.turkpatent.gov.tr${href}`;
    out.push({
      id,
      name,
      href: absHref,
      meta: [city, name, year, indication].filter(Boolean),
      image_url: img?.src || null,
    });
  }
  return out;
}
"""

DETAIL_IMAGE_JS = """
() => {
  const img = document.querySelector('img[src*="/Pictures/GeographicalSigns/"]');
  return img?.src || null;
}
"""


def load_provinces() -> list[dict]:
    payload = json.loads(PROVINCES_PATH.read_text(encoding="utf-8"))
    return list(payload["provinces"])


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
        "(": " ",
        ")": " ",
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def unique_slug(base: str, used: set[str]) -> str:
    slug = base or "urun"
    if slug not in used:
        used.add(slug)
        return slug
    idx = 2
    while f"{slug}-{idx}" in used:
        idx += 1
    candidate = f"{slug}-{idx}"
    used.add(candidate)
    return candidate


def normalize_city_key(city: str) -> str:
    return city.strip().casefold().replace("ı", "i").replace("İ", "i")


def guess_live_search_query(name: str, city: str, aliases: list[str]) -> str:
    for alias in aliases:
        cleaned = alias.strip()
        if len(cleaned) >= 3:
            return cleaned
    query = name.strip()
    city_fold = normalize_city_key(city)
    for token in city.split():
        if len(token) >= 3:
            query = re.sub(re.escape(token), "", query, flags=re.IGNORECASE).strip()
    query = re.sub(r"\s+", " ", query).strip(" -/")
    if len(query) >= 3:
        return query
    return name.strip()


def ext_from_url(url: str) -> str:
    path = urlparse(url).path
    suffix = Path(path).suffix.lower()
    return suffix if suffix in {".jpg", ".jpeg", ".png", ".webp"} else ".jpg"


def list_url(city_id: int, group_id: str) -> str:
    return f"{BASE}/cografi-isaretler/liste?il={city_id}&tur=&urunGrubu={group_id}&adi="


def scrape_group(page, *, city_id: int, city_name: str, group_id: str, used_slugs: set[str]) -> list[dict]:
    url = list_url(city_id, group_id)
    page.goto(url, wait_until="domcontentloaded", timeout=120000)
    try:
        page.wait_for_selector('a[href*="/cografi-isaretler/detay/"]', state="attached", timeout=120000)
    except Exception:
        page.wait_for_timeout(8000)
    rows = page.evaluate(LIST_SCRAPE_JS)
    items: list[dict] = []
    city_slug = slugify(city_name)

    for row in rows:
        raw_name = str(row["name"])
        primary = raw_name.split("/")[0].strip()
        if not primary:
            continue
        aliases = [
            part.strip()
            for part in raw_name.split("/")
            if part.strip() and part.strip() != primary
        ]
        prod_slug = slugify(primary)
        if prod_slug.startswith(f"{city_slug}-") or prod_slug == city_slug:
            base_slug = prod_slug
        elif prod_slug.startswith(city_slug):
            base_slug = prod_slug
        else:
            base_slug = f"{city_slug}-{prod_slug}"
        slug = unique_slug(base_slug, used_slugs)

        year_raw = next((m for m in row.get("meta", []) if str(m).isdigit() and len(str(m)) == 4), None)
        year = int(year_raw) if year_raw else 0
        indication = next(
            (m for m in row.get("meta", []) if "işaret" in str(m).casefold() or "isaret" in str(m).casefold()),
            "Mahreç İşareti",
        )

        items.append(
            {
                "turkpatent_id": str(row["id"]),
                "slug": slug,
                "name": primary,
                "aliases": aliases,
                "city": city_name,
                "city_id": city_id,
                "region": city_name,
                "summary": "",
                "product_group_id": group_id,
                "registration_year": year,
                "indication_type": indication,
                "detail_url": str(row["href"]),
                "list_url": url,
                "reference_image_url": row.get("image_url"),
                "image_url": f"/images/regional-flavors/{slug}{ext_from_url(row.get('image_url') or '')}",
                "live_search_query": guess_live_search_query(primary, city_name, aliases),
            }
        )
    return items


def resolve_image_url(page, item: dict) -> str | None:
    ref = item.get("reference_image_url")
    if ref:
        return str(ref)
    detail = item.get("detail_url") or f"{BASE}/cografi-isaretler/detay/{item['turkpatent_id']}"
    page.goto(detail, wait_until="networkidle", timeout=90000)
    image_url = page.evaluate(DETAIL_IMAGE_JS)
    return str(image_url) if image_url else None


def download_image_bytes(page, url: str) -> bytes | None:
    try:
        response = page.request.get(url, timeout=90000)
        if response.ok:
            return response.body()
    except Exception:
        return None
    return None


def write_image_copies(slug: str, url: str, body: bytes) -> None:
    ext = ext_from_url(url)
    ref_dir = DATA_DIR / "turkpatent_refs"
    web_dir = REPO_ROOT / "frontend" / "public" / "images" / "regional-flavors"
    mobile_dir = REPO_ROOT / "mobile" / "assets" / "regional-flavors"
    ref_dir.mkdir(parents=True, exist_ok=True)
    web_dir.mkdir(parents=True, exist_ok=True)
    mobile_dir.mkdir(parents=True, exist_ok=True)

    ref_path = ref_dir / f"{slug}{ext}"
    web_path = web_dir / f"{slug}{ext}"
    mobile_path = mobile_dir / f"{slug}{ext}"
    ref_path.write_bytes(body)
    web_path.write_bytes(body)
    mobile_path.write_bytes(body)


def load_bursa_legacy_by_id() -> dict[str, dict]:
    legacy_path = DATA_DIR / "bursa_geo_products.json"
    if not legacy_path.exists():
        return {}
    payload = json.loads(legacy_path.read_text(encoding="utf-8"))
    return {str(row["turkpatent_id"]): row for row in payload.get("items") or []}


def merge_items(existing: list[dict], fresh: list[dict]) -> list[dict]:
    legacy = load_bursa_legacy_by_id()
    by_id = {str(row["turkpatent_id"]): row for row in existing}
    for row in fresh:
        tid = str(row["turkpatent_id"])
        prev = by_id.get(tid) or legacy.get(tid)
        if prev:
            if prev.get("summary"):
                row["summary"] = prev["summary"]
            prev_slug = str(prev.get("slug") or "")
            if prev_slug and "-bursa-bursa-" not in prev_slug and not prev_slug.endswith("-2"):
                row["slug"] = prev_slug
                ext = ext_from_url(row.get("reference_image_url") or prev.get("reference_image_url") or "")
                row["image_url"] = f"/images/regional-flavors/{prev_slug}{ext}"
        by_id[tid] = row
    return sorted(by_id.values(), key=lambda r: (str(r.get("city") or ""), str(r.get("name") or "")))
