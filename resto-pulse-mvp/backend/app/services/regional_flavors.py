from __future__ import annotations

import re
import unicodedata

from app.core.config import settings
from app.data.turkiye_geo_products import (
    RegionalProductCatalogItem,
    catalog_for_city,
    find_product_by_slug,
    live_search_query_for,
    registry_note,
)
from app.models import Restaurant
from app.schemas.geo_indication import GeoIndicationRead


def _resolve_product_image_url(raw: str | None) -> str | None:
    """Yerel /images/... yollarini mobil icin tam site URL'sine cevirir."""
    if not raw or not raw.strip():
        return None
    url = raw.strip()
    if url.startswith(("http://", "https://")):
        return url
    base = settings.public_site_base_url.rstrip("/")
    path = url if url.startswith("/") else f"/{url}"
    return f"{base}{path}"

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
        "image_url": _resolve_product_image_url(product.image_url),
        "live_search_query": live_search_query_for(product),
    }


def list_regional_products(*, city: str = "Bursa") -> dict:
    city_clean = city.strip() or "Bursa"
    catalog = catalog_for_city(city_clean)
    items = [_product_payload(product) for product in catalog]
    return {"city": city_clean, "items": items, "registry_note": registry_note()}


def get_regional_product(*, slug: str, city: str = "Bursa") -> dict | None:
    product = find_product_by_slug(slug, city)
    if not product:
        return None
    return {
        "product": _product_payload(product),
        "discovery_note": DISCOVERY_NOTE,
    }


async def discover_regional_product_places(
    db,
    *,
    slug: str,
    city: str = "Bursa",
    origin_lat: float | None = None,
    origin_lng: float | None = None,
    limit: int = 20,
) -> dict | None:
    """Mahrec urun detayi + GastroSkor sirali canli arama sonuclari."""
    from fastapi import HTTPException

    base = get_regional_product(slug=slug, city=city)
    if not base:
        return None

    from app.services.live_place_search_service import search_live_places_optimized
    from app.services.query_parser import parse_search_query
    from app.services.smart_filters import merge_criteria

    query = base["product"]["live_search_query"]
    parsed = parse_search_query(query)
    criteria = merge_criteria(parsed, distance_band=None, rating_band=None)
    places: list[dict] = []
    places_error: str | None = None

    try:
        result = await search_live_places_optimized(
            db,
            q=query,
            city=city,
            limit=min(20, max(1, limit)),
            origin_lat=origin_lat,
            origin_lng=origin_lng,
            criteria=criteria,
            parsed=parsed,
            distance_band=None,
            rating_band=None,
        )
        places = [item.model_dump() for item in result.items]
    except HTTPException as exc:
        detail = exc.detail
        places_error = detail if isinstance(detail, str) else "Canli arama kullanilamiyor."
    except Exception:
        places_error = "Canli arama kullanilamiyor."

    return {
        **base,
        "search_query": query,
        "places": places,
        "places_count": len(places),
        "places_error": places_error,
    }
