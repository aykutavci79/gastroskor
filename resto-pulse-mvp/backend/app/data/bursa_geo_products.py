"""Bursa yöresel lezzet kataloğu — TÜRKPATENT Coğrafi İşaretler Portalı kaynaklı."""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

_DATA_PATH = Path(__file__).with_name("bursa_geo_products.json")
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
    registry_source: str = _REGISTRY_SOURCE


def _load_catalog_payload() -> dict:
    with _DATA_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


@lru_cache(maxsize=1)
def catalog_metadata() -> dict:
    payload = _load_catalog_payload()
    return {
        "scraped_at": payload.get("scraped_at"),
        "source_portal": payload.get("source_portal"),
        "city": payload.get("city"),
        "city_id": payload.get("city_id"),
        "scope": payload.get("scope"),
        "product_count": len(payload.get("items") or []),
    }


def _parse_item(raw: dict, product_groups: dict[str, str]) -> RegionalProductCatalogItem:
    group_id = str(raw["product_group_id"])
    return RegionalProductCatalogItem(
        slug=str(raw["slug"]),
        name=str(raw["name"]),
        city=str(raw.get("city") or "Bursa"),
        region=str(raw.get("region") or "Bursa"),
        summary=str(raw.get("summary") or ""),
        aliases=tuple(str(alias) for alias in raw.get("aliases") or ()),
        turkpatent_id=str(raw["turkpatent_id"]),
        product_group_id=group_id,
        product_group=product_groups.get(group_id, group_id),
        registration_year=int(raw["registration_year"]),
        indication_type=str(raw.get("indication_type") or "Mahreç İşareti"),
        detail_url=str(raw["detail_url"]),
        list_url=str(raw.get("list_url") or ""),
    )


@lru_cache(maxsize=1)
def _all_products() -> tuple[RegionalProductCatalogItem, ...]:
    payload = _load_catalog_payload()
    groups = {str(k): str(v) for k, v in (payload.get("product_groups") or {}).items()}
    items = [_parse_item(raw, groups) for raw in payload.get("items") or []]
    return tuple(items)


def catalog_for_city(city: str | None) -> tuple[RegionalProductCatalogItem, ...]:
    key = (city or "Bursa").strip().casefold()
    if key in {"bursa", "bursa ili"}:
        return _all_products()
    return tuple(item for item in _all_products() if item.city.casefold() == key)


def find_product_by_slug(slug: str, city: str | None = None) -> RegionalProductCatalogItem | None:
    normalized = slug.strip().casefold()
    for item in catalog_for_city(city):
        if item.slug.casefold() == normalized:
            return item
    return None


def registry_note() -> str:
    meta = catalog_metadata()
    scraped = meta.get("scraped_at") or "bilinmiyor"
    count = meta.get("product_count") or len(_all_products())
    return (
        f"Ürün listesi TÜRKPATENT Coğrafi İşaretler Portalı'ndan (ci.turkpatent.gov.tr) "
        f"derlenmiştir — Bursa yemek ve fırın/pastane grupları, {count} ürün. "
        f"Son senkron: {scraped}. Restoran rozeti menüde sunulan yöresel lezzeti gösterir."
    )
