"""Türkiye yöresel lezzet kataloğu — TÜRKPATENT Coğrafi İşaretler Portalı."""

from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from app.data.gastro_regional_filter import is_gastro_regional_product
from app.data.regional_city_match import detect_city_mismatch

_DATA_PATH = Path(__file__).with_name("turkiye_geo_products.json")
_FALLBACK_PATH = Path(__file__).with_name("bursa_geo_products.json")
_OVERRIDES_PATH = Path(__file__).with_name("regional_flavor_overrides.json")
_REGISTRY_SOURCE = "Türk Patent ve Marka Kurumu — Coğrafi İşaretler Portalı"


@dataclass(frozen=True)
class RegionalProductCatalogItem:
    slug: str
    name: str
    city: str
    region: str
    summary: str
    aliases: tuple[str, ...]
    turkpatent_id: str
    product_group_id: str
    product_group: str
    registration_year: int
    indication_type: str
    detail_url: str
    list_url: str
    live_search_query: str
    city_id: int | None = None
    image_url: str | None = None
    reference_image_url: str | None = None
    registry_source: str = _REGISTRY_SOURCE


def _load_catalog_payload() -> dict:
    path = _DATA_PATH if _DATA_PATH.exists() else _FALLBACK_PATH
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


@lru_cache(maxsize=1)
def catalog_metadata() -> dict:
    payload = _load_catalog_payload()
    gastro_count = len(_gastro_products())
    raw_count = len(payload.get("items") or [])
    return {
        "scraped_at": payload.get("scraped_at"),
        "source_portal": payload.get("source_portal"),
        "scope": payload.get("scope"),
        "product_count": gastro_count,
        "raw_product_count": raw_count,
        "province_count": payload.get("province_count"),
    }


@lru_cache(maxsize=1)
def _bursa_enrichment_by_slug() -> dict[str, dict]:
    """Bursa katalogundaki elle zenginlestirilmis alanlar (alias, arama, gorsel)."""
    if not _FALLBACK_PATH.exists():
        return {}
    with _FALLBACK_PATH.open(encoding="utf-8") as handle:
        payload = json.load(handle)
    return {str(item["slug"]): item for item in payload.get("items") or []}


def _parse_item(raw: dict, product_groups: dict[str, str]) -> RegionalProductCatalogItem:
    group_id = str(raw["product_group_id"])
    slug = str(raw["slug"])
    city = str(raw.get("city") or "")
    enrich = _bursa_enrichment_by_slug().get(slug, {})
    use_enrich = city == "Bursa" and bool(enrich)

    if use_enrich and enrich.get("aliases"):
        aliases = tuple(str(alias) for alias in enrich["aliases"])
    else:
        aliases = tuple(str(alias) for alias in raw.get("aliases") or ())

    if use_enrich and enrich.get("image_url"):
        image_url = str(enrich["image_url"]).strip()
    elif raw.get("image_url"):
        image_url = str(raw["image_url"]).strip()
    else:
        image_url = None

    if use_enrich and enrich.get("live_search_query"):
        live_search_query = str(enrich["live_search_query"])
    else:
        live_search_query = str(raw.get("live_search_query") or raw["name"])

    return RegionalProductCatalogItem(
        slug=slug,
        name=str(raw["name"]),
        city=city,
        region=str(raw.get("region") or raw.get("city") or ""),
        summary=str(raw.get("summary") or ""),
        aliases=aliases,
        turkpatent_id=str(raw["turkpatent_id"]),
        product_group_id=group_id,
        product_group=product_groups.get(group_id, group_id),
        registration_year=int(raw.get("registration_year") or 0),
        indication_type=str(raw.get("indication_type") or "Mahreç İşareti"),
        detail_url=str(raw["detail_url"]),
        list_url=str(raw.get("list_url") or ""),
        live_search_query=live_search_query,
        city_id=int(raw["city_id"]) if raw.get("city_id") is not None else None,
        image_url=image_url,
        reference_image_url=str(raw["reference_image_url"]).strip() if raw.get("reference_image_url") else None,
    )


@lru_cache(maxsize=1)
def _all_products() -> tuple[RegionalProductCatalogItem, ...]:
    payload = _load_catalog_payload()
    groups = {str(k): str(v) for k, v in (payload.get("product_groups") or {}).items()}
    items = [_parse_item(raw, groups) for raw in payload.get("items") or []]
    return tuple(items)


@lru_cache(maxsize=1)
def _manual_override_sets() -> tuple[frozenset[str], frozenset[str]]:
    if not _OVERRIDES_PATH.exists():
        return frozenset(), frozenset()
    payload = json.loads(_OVERRIDES_PATH.read_text(encoding="utf-8"))
    excludes = frozenset(str(slug) for slug in payload.get("exclude_slugs") or ())
    includes = frozenset(str(slug) for slug in payload.get("include_slugs") or ())
    return excludes, includes


def _catalog_item_visible(item: RegionalProductCatalogItem) -> bool:
    excludes, includes = _manual_override_sets()
    if item.slug in excludes:
        return False
    if item.slug in includes:
        return True
    if detect_city_mismatch(name=item.name, city=item.city, aliases=item.aliases):
        return False
    return is_gastro_regional_product(
        name=item.name,
        aliases=item.aliases,
        product_group_id=item.product_group_id,
    )


@lru_cache(maxsize=1)
def _gastro_products() -> tuple[RegionalProductCatalogItem, ...]:
    return tuple(item for item in _all_products() if _catalog_item_visible(item))


def _normalize_city(city: str | None) -> str:
    """Mobil `Izmir` / `Istanbul` ile katalog `İzmir` / `İstanbul` eşleşmesi."""
    text = unicodedata.normalize("NFKD", (city or "").strip())
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = (
        text.casefold()
        .replace("ı", "i")
        .replace("ğ", "g")
        .replace("ü", "u")
        .replace("ş", "s")
        .replace("ö", "o")
        .replace("ç", "c")
    )
    return re.sub(r"[^a-z0-9]+", "", text)


def catalog_for_city(city: str | None) -> tuple[RegionalProductCatalogItem, ...]:
    pool = _gastro_products()
    key = _normalize_city(city)
    if not key:
        return pool
    return tuple(item for item in pool if _normalize_city(item.city) == key)


def find_product_by_slug(slug: str, city: str | None = None) -> RegionalProductCatalogItem | None:
    normalized = slug.strip().casefold()
    pool = catalog_for_city(city) if city else _gastro_products()
    for item in pool:
        if item.slug.casefold() == normalized:
            return item
    if city:
        for item in _gastro_products():
            if item.slug.casefold() == normalized:
                return item
    return None


def live_search_query_for(product: RegionalProductCatalogItem) -> str:
    query = product.live_search_query.strip()
    if query:
        return query
    for alias in product.aliases:
        cleaned = alias.strip()
        if cleaned and len(cleaned) >= 3:
            return cleaned
    return product.name


def registry_note() -> str:
    meta = catalog_metadata()
    scraped = meta.get("scraped_at") or "bilinmiyor"
    count = meta.get("product_count") or len(_gastro_products())
    raw = meta.get("raw_product_count")
    raw_part = f" (TÜRKPATENT ham liste: {raw})" if raw and raw != count else ""
    provinces = meta.get("province_count")
    province_part = f", {provinces} il" if provinces else ""
    return (
        f"Ürün listesi TÜRKPATENT Coğrafi İşaretler Portalı'ndan (ci.turkpatent.gov.tr) "
        f"derlenmiştir — GastroSkor yemek/fırın vitrini: {count} ürün{raw_part}{province_part}. "
        f"Son senkron: {scraped}. Görseller portal referansıdır; restoran onayı anlamına gelmez."
    )
