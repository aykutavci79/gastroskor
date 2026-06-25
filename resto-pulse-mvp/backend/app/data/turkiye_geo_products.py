"""Türkiye yöresel lezzet kataloğu — TÜRKPATENT Coğrafi İşaretler Portalı."""

from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

_DATA_PATH = Path(__file__).with_name("turkiye_geo_products.json")
_FALLBACK_PATH = Path(__file__).with_name("bursa_geo_products.json")
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
    return {
        "scraped_at": payload.get("scraped_at"),
        "source_portal": payload.get("source_portal"),
        "scope": payload.get("scope"),
        "product_count": len(payload.get("items") or []),
        "province_count": payload.get("province_count"),
    }


def _parse_item(raw: dict, product_groups: dict[str, str]) -> RegionalProductCatalogItem:
    group_id = str(raw["product_group_id"])
    return RegionalProductCatalogItem(
        slug=str(raw["slug"]),
        name=str(raw["name"]),
        city=str(raw.get("city") or ""),
        region=str(raw.get("region") or raw.get("city") or ""),
        summary=str(raw.get("summary") or ""),
        aliases=tuple(str(alias) for alias in raw.get("aliases") or ()),
        turkpatent_id=str(raw["turkpatent_id"]),
        product_group_id=group_id,
        product_group=product_groups.get(group_id, group_id),
        registration_year=int(raw.get("registration_year") or 0),
        indication_type=str(raw.get("indication_type") or "Mahreç İşareti"),
        detail_url=str(raw["detail_url"]),
        list_url=str(raw.get("list_url") or ""),
        live_search_query=str(raw.get("live_search_query") or raw["name"]),
        city_id=int(raw["city_id"]) if raw.get("city_id") is not None else None,
        image_url=str(raw["image_url"]).strip() if raw.get("image_url") else None,
        reference_image_url=str(raw["reference_image_url"]).strip() if raw.get("reference_image_url") else None,
    )


@lru_cache(maxsize=1)
def _all_products() -> tuple[RegionalProductCatalogItem, ...]:
    payload = _load_catalog_payload()
    groups = {str(k): str(v) for k, v in (payload.get("product_groups") or {}).items()}
    items = [_parse_item(raw, groups) for raw in payload.get("items") or []]
    return tuple(items)


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
    key = _normalize_city(city)
    if not key:
        return _all_products()
    return tuple(item for item in _all_products() if _normalize_city(item.city) == key)


def find_product_by_slug(slug: str, city: str | None = None) -> RegionalProductCatalogItem | None:
    normalized = slug.strip().casefold()
    pool = catalog_for_city(city) if city else _all_products()
    for item in pool:
        if item.slug.casefold() == normalized:
            return item
    if city:
        for item in _all_products():
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
    count = meta.get("product_count") or len(_all_products())
    provinces = meta.get("province_count")
    province_part = f", {provinces} il" if provinces else ""
    return (
        f"Ürün listesi TÜRKPATENT Coğrafi İşaretler Portalı'ndan (ci.turkpatent.gov.tr) "
        f"derlenmiştir — {count} ürün{province_part}. "
        f"Son senkron: {scraped}. Görseller portal referansıdır; restoran onayı anlamına gelmez."
    )
