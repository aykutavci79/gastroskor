"""Bursa teslimat adresi — NVI sokak listesi + manuel kapı no + Google geocode."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.config import settings
from app.integrations.google_geocoding import geocode_delivery_address
from app.models.entities import AddressNodeCache
from app.services.gastro_score_ranking import haversine_meters

logger = logging.getLogger(__name__)
BURSA_LABEL = "Bursa"
ADMIN_LEVELS = frozenset({"district", "neighborhood", "street"})
SEED_PATH = Path(__file__).resolve().parents[1] / "data" / "bursa_address_nodes.json"


class DeliveryAddressError(Exception):
    def __init__(self, message: str, *, code: str = "invalid_address") -> None:
        super().__init__(message)
        self.code = code


def _province_id() -> int:
    return int(settings.bursa_tradres_province_id)


def ensure_bursa_address_seed(db: Session) -> int:
    """DB bos ise repodaki JSON seed'i yukler (Railway ilk deploy)."""
    total = db.scalar(select(func.count()).select_from(AddressNodeCache)) or 0
    if total > 100:
        return total
    if not SEED_PATH.is_file():
        logger.warning("Bursa address seed dosyasi yok: %s", SEED_PATH)
        return total
    nodes = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    if not isinstance(nodes, list) or not nodes:
        return total
    now = datetime.now(timezone.utc)
    batch_size = 500
    for offset in range(0, len(nodes), batch_size):
        chunk = nodes[offset : offset + batch_size]
        rows = [
            {
                "tradres_id": row["tradres_id"],
                "parent_id": row.get("parent_id"),
                "level": row["level"],
                "name": row["name"],
                "synced_at": now,
            }
            for row in chunk
            if isinstance(row, dict)
        ]
        stmt = insert(AddressNodeCache).values(rows)
        stmt = stmt.on_conflict_do_update(
            index_elements=[AddressNodeCache.tradres_id],
            set_={
                "parent_id": stmt.excluded.parent_id,
                "level": stmt.excluded.level,
                "name": stmt.excluded.name,
                "synced_at": stmt.excluded.synced_at,
            },
        )
        db.execute(stmt)
    db.commit()
    loaded = db.scalar(select(func.count()).select_from(AddressNodeCache)) or 0
    logger.info("Bursa address seed yuklendi: %s dugum", loaded)
    return loaded


def list_address_children(
    db: Session,
    *,
    parent_id: int | None = None,
    level_filter: str | None = None,
) -> list[dict]:
    effective_parent = parent_id if parent_id is not None else _province_id()
    rows = db.scalars(
        select(AddressNodeCache)
        .where(AddressNodeCache.parent_id == effective_parent)
        .order_by(AddressNodeCache.name.asc())
    ).all()
    if not rows and effective_parent == _province_id():
        raise DeliveryAddressError(
            "Adres verisi henuz yuklenmemis. Sunucuda import_bursa_address_nodes calistirin.",
            code="address_data_missing",
        )
    items: list[dict] = []
    for row in rows:
        level = (row.level or "").strip().lower()
        if level_filter == "admin" and level not in ADMIN_LEVELS:
            continue
        if level_filter == "building":
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


def _walk_chain(db: Session, street_id: int) -> list[AddressNodeCache]:
    chain: list[AddressNodeCache] = []
    current_id: int | None = street_id
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


def format_address_label(
    chain: list[AddressNodeCache],
    *,
    door_number: str | None = None,
    note: str | None = None,
) -> str:
    parts = [row.name for row in chain if row.name and (row.level or "").lower() != "province"]
    if BURSA_LABEL.casefold() not in {p.casefold() for p in parts}:
        parts.insert(0, BURSA_LABEL)
    door = (door_number or "").strip()
    if door:
        parts.append(f"No: {door}")
    label = ", ".join(parts)
    clean_note = (note or "").strip()
    if clean_note:
        label = f"{label} — {clean_note}"
    return label


def _ensure_street(db: Session, street_id: int) -> AddressNodeCache:
    row = db.get(AddressNodeCache, street_id)
    if row is None:
        raise DeliveryAddressError("Secilen sokak kaydi bulunamadi.", code="street_not_found")
    if (row.level or "").strip().lower() != "street":
        raise DeliveryAddressError("Gecerli bir sokak secin.", code="not_street")
    return row


def geocode_street_address(
    db: Session,
    *,
    street_id: int,
    door_number: str,
    address_note: str | None,
) -> tuple[str, float, float]:
    _ensure_street(db, street_id)
    door = door_number.strip()
    if len(door) < 1 or len(door) > 20:
        raise DeliveryAddressError("Kapı numarasi girin (1-20 karakter).", code="invalid_door")
    chain = _walk_chain(db, street_id)
    if len(chain) < 3:
        raise DeliveryAddressError("Adres hiyerarsisi eksik. Listeden yeniden secin.", code="incomplete_chain")
    query = format_address_label(chain, door_number=door, note=address_note)
    coords = geocode_delivery_address(query)
    if coords is None:
        raise DeliveryAddressError(
            "Adres koordinati dogrulanamadi. Sokak ve kapı numarasini kontrol edin.",
            code="geocode_failed",
        )
    return query, coords[0], coords[1]


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
    street_node_id: int,
    door_number: str,
    address_note: str | None,
    device_lat: float | None,
    device_lng: float | None,
) -> tuple[str, float, float]:
    formatted, lat, lng = geocode_street_address(
        db,
        street_id=street_node_id,
        door_number=door_number,
        address_note=address_note,
    )
    validate_delivery_gps(
        delivery_lat=lat,
        delivery_lng=lng,
        device_lat=device_lat,
        device_lng=device_lng,
    )
    if len(formatted) < 10:
        raise DeliveryAddressError("Teslimat adresi gecersiz.", code="invalid_address")
    return formatted, lat, lng
