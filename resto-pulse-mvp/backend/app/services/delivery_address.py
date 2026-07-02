"""Bursa numarataj kademeli teslimat adresi — Tradres + cache + GPS dogrulama."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.integrations.google_geocoding import geocode_delivery_address
from app.integrations.tradres_client import (
    TradresNode,
    fetch_tradres_children,
    is_building_level,
)
from app.models.entities import AddressNodeCache
from app.services.gastro_score_ranking import haversine_meters

BURSA_LABEL = "Bursa"


class DeliveryAddressError(Exception):
    def __init__(self, message: str, *, code: str = "invalid_address") -> None:
        super().__init__(message)
        self.code = code


def _province_id() -> int:
    return int(settings.bursa_tradres_province_id)


def _upsert_cache(db: Session, node: TradresNode) -> AddressNodeCache:
    row = db.get(AddressNodeCache, node.id)
    if row is None:
        row = AddressNodeCache(
            tradres_id=node.id,
            parent_id=node.parent_id,
            level=node.level,
            name=node.name,
        )
        db.add(row)
    else:
        row.parent_id = node.parent_id
        row.level = node.level
        row.name = node.name
        row.synced_at = datetime.now(timezone.utc)
    return row


def sync_children(db: Session, *, parent_id: int | None) -> list[AddressNodeCache]:
    nodes = fetch_tradres_children(parent_id=parent_id)
    rows: list[AddressNodeCache] = []
    for node in nodes:
        rows.append(_upsert_cache(db, node))
    db.commit()
    return rows


def list_address_children(
    db: Session,
    *,
    parent_id: int | None = None,
    level_filter: str | None = None,
) -> list[dict]:
    if parent_id is None:
        parent_id = _province_id()
    try:
        rows = sync_children(db, parent_id=parent_id)
    except Exception as exc:
        message = "Adres listesi su an yuklenemedi. Birkac dakika sonra tekrar dene."
        if settings.environment.strip().lower() == "development":
            message = f"{message} ({type(exc).__name__}: {exc})"
        raise DeliveryAddressError(message, code="address_provider_unavailable") from exc
    items: list[dict] = []
    for row in rows:
        level = (row.level or "").strip()
        if level_filter == "building" and not is_building_level(level):
            continue
        if level_filter == "admin" and is_building_level(level):
            continue
        items.append(
            {
                "id": row.tradres_id,
                "name": row.name,
                "level": row.level,
                "parent_id": row.parent_id,
                "latitude": row.latitude,
                "longitude": row.longitude,
            }
        )
    return items


def _walk_chain(db: Session, building_id: int) -> list[AddressNodeCache]:
    chain: list[AddressNodeCache] = []
    current_id: int | None = building_id
    seen: set[int] = set()
    while current_id is not None and current_id not in seen:
        seen.add(current_id)
        row = db.get(AddressNodeCache, current_id)
        if row is None:
            break
        chain.append(row)
        current_id = row.parent_id
    chain.reverse()
    return chain


def format_address_label(chain: list[AddressNodeCache], *, note: str | None = None) -> str:
    parts = [row.name for row in chain if row.name]
    if BURSA_LABEL.casefold() not in {p.casefold() for p in parts}:
        parts.insert(0, BURSA_LABEL)
    label = ", ".join(parts)
    clean_note = (note or "").strip()
    if clean_note:
        label = f"{label} — {clean_note}"
    return label


def ensure_building_coordinates(db: Session, building_id: int) -> tuple[float, float]:
    row = db.get(AddressNodeCache, building_id)
    if row is None:
        raise DeliveryAddressError("Secilen adres kaydi bulunamadi.", code="building_not_found")
    if not is_building_level(row.level or ""):
        raise DeliveryAddressError("Gecerli bir kapı numarasi secin.", code="not_building")
    if row.latitude is not None and row.longitude is not None:
        return float(row.latitude), float(row.longitude)
    chain = _walk_chain(db, building_id)
    if len(chain) < 3:
        raise DeliveryAddressError("Adres hiyerarsisi eksik. Listeden yeniden secin.", code="incomplete_chain")
    query = format_address_label(chain)
    coords = geocode_delivery_address(query)
    if coords is None:
        raise DeliveryAddressError(
            "Adres koordinati dogrulanamadi. Listeden bina numarasini kontrol edin.",
            code="geocode_failed",
        )
    row.latitude, row.longitude = coords
    row.geocoded_at = datetime.now(timezone.utc)
    db.add(row)
    db.commit()
    return coords


def validate_delivery_gps(
    *,
    delivery_lat: float,
    delivery_lng: float,
    device_lat: float | None,
    device_lng: float | None,
) -> None:
    if device_lat is None or device_lng is None:
        raise DeliveryAddressError(
            "Teslimat icin konum izni gerekli. Ayarlardan acip tekrar deneyin.",
            code="location_required",
        )
    max_m = float(settings.delivery_address_gps_max_m)
    distance = haversine_meters(device_lat, device_lng, delivery_lat, delivery_lng)
    if distance > max_m:
        raise DeliveryAddressError(
            f"Teslimat adresi konumunuzla uyusmuyor ({int(distance)} m). "
            f"Adreste oldugunuzdan emin olun veya listeyi yenileyin.",
            code="gps_mismatch",
        )


def resolve_delivery_address(
    db: Session,
    *,
    building_node_id: int,
    address_note: str | None,
    device_lat: float | None,
    device_lng: float | None,
) -> tuple[str, float, float]:
    lat, lng = ensure_building_coordinates(db, building_node_id)
    validate_delivery_gps(
        delivery_lat=lat,
        delivery_lng=lng,
        device_lat=device_lat,
        device_lng=device_lng,
    )
    chain = _walk_chain(db, building_node_id)
    formatted = format_address_label(chain, note=address_note)
    if len(formatted) < 10:
        raise DeliveryAddressError("Teslimat adresi gecersiz.", code="invalid_address")
    return formatted, lat, lng
