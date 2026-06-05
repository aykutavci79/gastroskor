from __future__ import annotations

import re
import unicodedata

from app.data.bursa_geo_products import (
    RegionalProductCatalogItem,
    catalog_for_city,
    find_product_by_slug,
    live_search_query_for,
    registry_note,
)
from app.models import Restaurant
from app.schemas.geo_indication import GeoIndicationRead

DISCOVERY_NOTE = (
    "Aşağıdaki mekanlar Google canlı araması ile listelenir. "
    "GastroSkor restoran onayı vermez; mahreç uyumu işletmeye aittir."
)

# Sehir / bolge adlari tek basina eslestirme yapmaz (orn. "Bursa" != her Bursa urunu).
_GENERIC_MATCH_TOKENS = frozenset(
    {
        "bursa",
        "inegol",
        "kemalpasa",
        "mustafakemalpaşa",
        "mustafakemalpasa",
        "zeyniler",
        "turkiye",
        "turkey",
    }
)


def _normalize_key(value: str) -> str:
    text = unicodedata.normalize("NFKD", value.strip().casefold())
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = (
        text.replace("ı", "i")
        .replace("ğ", "g")
        .replace("ü", "u")
        .replace("ş", "s")
        .replace("ö", "o")
        .replace("ç", "c")
    )
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def _parse_geo_indications(raw: list | None) -> list[GeoIndicationRead]:
    if not raw:
        return []
    parsed: list[GeoIndicationRead] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        product = str(item.get("product") or "").strip()
        if len(product) < 2:
            continue
        parsed.append(
            GeoIndicationRead(
                product=product,
                region=item.get("region"),
                registry_note=item.get("registry_note"),
            )
        )
    return parsed


def _restaurant_product_labels(restaurant: Restaurant) -> list[str]:
    labels: list[str] = []
    for gi in _parse_geo_indications(restaurant.geo_indications):
        labels.append(gi.product)
    if restaurant.gi_product_name:
        labels.append(restaurant.gi_product_name.strip())
    return labels


def _distinct_tokens(text: str) -> set[str]:
    return {token for token in _normalize_key(text).split() if token and token not in _GENERIC_MATCH_TOKENS}


def _label_matches_product(label: str, product_keys: list[str]) -> bool:
    normalized_label = _normalize_key(label)
    if not normalized_label:
        return False
    normalized_keys = {_normalize_key(key) for key in product_keys if key.strip()}
    if normalized_label in normalized_keys:
        return True
    label_tokens = _distinct_tokens(normalized_label)
    for key in normalized_keys:
        if not key:
            continue
        if len(key) >= 6 and (key in normalized_label or normalized_label in key):
            return True
        key_tokens = _distinct_tokens(key)
        if not key_tokens:
            continue
        overlap = label_tokens & key_tokens
        if len(overlap) >= 2:
            return True
        if len(overlap) == 1:
            token = next(iter(overlap))
            if len(token) >= 5:
                return True
    return False


def restaurant_serves_product(restaurant: Restaurant, product: RegionalProductCatalogItem) -> bool:
    """Restoran profil rozetleri icin — yoresel urun listesinde kullanilmaz."""
    if not restaurant.has_geographical_indication and not restaurant.geo_indications:
        return False
    labels = [label for label in _restaurant_product_labels(restaurant) if label]
    if not labels:
        return False
    keys = list(product.aliases) + [product.name]
    for label in labels:
        if _label_matches_product(label, keys):
            return True
    return False


def _product_payload(product: RegionalProductCatalogItem) -> dict:
    return {
        "slug": product.slug,
        "name": product.name,
        "city": product.city,
        "region": product.region,
        "summary": product.summary,
        "registry_source": product.registry_source,
        "turkpatent_id": product.turkpatent_id,
        "registration_year": product.registration_year,
        "indication_type": product.indication_type,
        "product_group": product.product_group,
        "detail_url": product.detail_url,
        "image_url": product.image_url,
        "live_search_query": live_search_query_for(product),
    }


def list_regional_products(*, city: str = "Bursa") -> dict:
    catalog = catalog_for_city(city)
    items = [_product_payload(product) for product in catalog]
    return {"city": city.strip() or "Bursa", "items": items, "registry_note": registry_note()}


def get_regional_product(*, slug: str, city: str = "Bursa") -> dict | None:
    product = find_product_by_slug(slug, city)
    if not product:
        return None
    return {
        "product": _product_payload(product),
        "discovery_note": DISCOVERY_NOTE,
    }
