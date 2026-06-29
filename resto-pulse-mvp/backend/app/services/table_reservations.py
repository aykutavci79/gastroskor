"""Masa rezervasyonu — cift onay akisi."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import (
    Restaurant,
    RestaurantFloorPlan,
    RestaurantOwnership,
    RestaurantTableReservation,
    RestaurantTableReservationStatus,
    User,
)
from app.services.reservation_floor_plan import (
    FloorPlanError,
    find_table,
    normalize_layout,
    zone_label_tr,
)
from app.services.restaurant_orders import normalize_phone, OrderError
from app.services.restaurant_promo import subscription_allows_promo

CUSTOMER_CONFIRM_HOURS = 24
DEFAULT_SEATING_DURATION_MINUTES = 180
DEFAULT_ONLINE_RESERVATION_MAX_PARTY = 10
PANEL_ONLINE_RESERVATION_MAX_PARTY_CAP = 100
ACTIVE_STATUSES = (
    RestaurantTableReservationStatus.pending_restaurant,
    RestaurantTableReservationStatus.approved_by_restaurant,
    RestaurantTableReservationStatus.confirmed,
)


class ReservationError(Exception):
    def __init__(self, message: str, *, code: str = "reservation") -> None:
        super().__init__(message)
        self.message = message
        self.code = code


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def online_reservations_configured(ownership: RestaurantOwnership | None) -> bool:
    if not ownership or not ownership.online_reservations_enabled:
        return False
    if not subscription_allows_promo(ownership.subscription):
        return False
    return True


def effective_online_reservation_max_party(ownership: RestaurantOwnership) -> int:
    raw = ownership.online_reservation_max_party_size or DEFAULT_ONLINE_RESERVATION_MAX_PARTY
    try:
        value = int(raw)
    except (TypeError, ValueError):
        value = DEFAULT_ONLINE_RESERVATION_MAX_PARTY
    return max(1, min(value, PANEL_ONLINE_RESERVATION_MAX_PARTY_CAP))


def get_or_create_floor_plan(db: Session, *, restaurant_id: UUID) -> RestaurantFloorPlan:
    row = db.scalar(select(RestaurantFloorPlan).where(RestaurantFloorPlan.restaurant_id == restaurant_id))
    if row:
        return row
    row = RestaurantFloorPlan(restaurant_id=restaurant_id, draft_layout=normalize_layout(None))
    db.add(row)
    db.flush()
    return row


def floor_plan_to_dict(row: RestaurantFloorPlan | None, *, published: bool = False) -> dict | None:
    if not row:
        return None
    layout = row.published_layout if published else (row.draft_layout or row.published_layout)
    return {
        "restaurant_id": str(row.restaurant_id),
        "background_url": row.background_url,
        "layout": layout,
        "published_at": row.published_at.isoformat() if row.published_at else None,
        "has_published": bool(row.published_layout),
    }


def save_draft_floor_plan(
    db: Session,
    *,
    restaurant_id: UUID,
    layout: dict,
    background_url: str | None,
) -> RestaurantFloorPlan:
    try:
        normalized = normalize_layout(layout)
    except FloorPlanError as exc:
        raise ReservationError(exc.message) from exc
    row = get_or_create_floor_plan(db, restaurant_id=restaurant_id)
    row.draft_layout = normalized
    if background_url is not None:
        row.background_url = background_url.strip() or None
    row.updated_at = _utcnow()
    db.commit()
    db.refresh(row)
    return row


def publish_floor_plan(db: Session, *, restaurant_id: UUID) -> RestaurantFloorPlan:
    row = get_or_create_floor_plan(db, restaurant_id=restaurant_id)
    draft = row.draft_layout or empty_if_none(row.published_layout)
    try:
        normalized = normalize_layout(draft)
    except FloorPlanError as exc:
        raise ReservationError(exc.message) from exc
    if not normalized.get("tables"):
        raise ReservationError("Yayinlamak icin en az bir masa ekleyin.")
    row.published_layout = normalized
    row.published_at = _utcnow()
    row.updated_at = _utcnow()
    db.commit()
    db.refresh(row)
    return row


def empty_if_none(value: dict | None) -> dict:
    return value if isinstance(value, dict) else {"version": 1, "tables": [], "pois": []}


def get_published_plan(db: Session, *, restaurant_id: UUID) -> RestaurantFloorPlan | None:
    row = db.scalar(select(RestaurantFloorPlan).where(RestaurantFloorPlan.restaurant_id == restaurant_id))
    if not row or not row.published_layout:
        return None
    return row


def _ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def seating_duration() -> timedelta:
    return timedelta(minutes=DEFAULT_SEATING_DURATION_MINUTES)


def reservation_blocks_slot(
    reservation_start: datetime,
    slot: datetime,
    *,
    duration_minutes: int = DEFAULT_SEATING_DURATION_MINUTES,
) -> bool:
    """True when slot falls inside [reservation_start, reservation_start + duration)."""
    start = _ensure_utc(reservation_start)
    point = _ensure_utc(slot)
    end = start + timedelta(minutes=duration_minutes)
    return start <= point < end


def reservations_overlap(
    start_a: datetime,
    start_b: datetime,
    *,
    duration_minutes: int = DEFAULT_SEATING_DURATION_MINUTES,
) -> bool:
    """True when two half-open seating windows share any time."""
    duration = timedelta(minutes=duration_minutes)
    a = _ensure_utc(start_a)
    b = _ensure_utc(start_b)
    return a < b + duration and b < a + duration


def _active_reservations_near(
    db: Session,
    *,
    restaurant_id: UUID,
    center: datetime,
    table_id: str | None = None,
) -> list[RestaurantTableReservation]:
    """Fetch active reservations whose start may overlap a slot or new booking."""
    center = _ensure_utc(center)
    duration = seating_duration()
    query = select(RestaurantTableReservation).where(
        RestaurantTableReservation.restaurant_id == restaurant_id,
        RestaurantTableReservation.status.in_(ACTIVE_STATUSES),
        RestaurantTableReservation.reserved_at > center - duration,
        RestaurantTableReservation.reserved_at < center + duration,
    )
    if table_id is not None:
        query = query.where(RestaurantTableReservation.table_id == table_id)
    return list(db.scalars(query).all())


def table_is_reserved(
    db: Session,
    *,
    restaurant_id: UUID,
    table_id: str,
    reserved_at: datetime,
) -> bool:
    slot = _ensure_utc(reserved_at)
    for row in _active_reservations_near(
        db, restaurant_id=restaurant_id, center=slot, table_id=table_id
    ):
        if reservations_overlap(row.reserved_at, slot):
            return True
    return False


def reservation_to_dict(row: RestaurantTableReservation, *, restaurant_name: str | None = None) -> dict:
    return {
        "id": str(row.id),
        "restaurant_id": str(row.restaurant_id),
        "restaurant_name": restaurant_name,
        "user_id": str(row.user_id),
        "table_id": row.table_id,
        "table_label": row.table_label,
        "zone": row.zone,
        "zone_label": zone_label_tr(row.zone),
        "party_size": row.party_size,
        "reserved_at": row.reserved_at.isoformat(),
        "note": row.note,
        "customer_phone": row.customer_phone,
        "customer_name": row.customer_name,
        "status": row.status.value,
        "reject_reason_text": row.reject_reason_text,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "restaurant_decided_at": row.restaurant_decided_at.isoformat() if row.restaurant_decided_at else None,
        "customer_confirmed_at": row.customer_confirmed_at.isoformat() if row.customer_confirmed_at else None,
        "customer_confirm_expires_at": row.customer_confirm_expires_at.isoformat()
        if row.customer_confirm_expires_at
        else None,
    }


def create_table_reservation(
    db: Session,
    *,
    restaurant: Restaurant,
    ownership: RestaurantOwnership,
    user: User,
    table_id: str,
    party_size: int,
    reserved_at: datetime,
    note: str | None,
    customer_phone: str,
    customer_name: str | None,
) -> RestaurantTableReservation:
    if not online_reservations_configured(ownership):
        raise ReservationError("Bu restoran online rezervasyon almiyor.")
    plan_row = get_published_plan(db, restaurant_id=restaurant.id)
    if not plan_row or not plan_row.published_layout:
        raise ReservationError("Restoran henuz salon plani yayinlamadi.")
    layout = plan_row.published_layout
    table = find_table(layout, table_id)
    if not table:
        raise ReservationError("Secilen masa bulunamadi.")
    if table.get("reservation_closed"):
        raise ReservationError("Bu masa su an rezervasyona kapali.")
    max_online_party = effective_online_reservation_max_party(ownership)
    if party_size > max_online_party:
        raise ReservationError(
            f"Kisi sayisi yuksek. Uygulama uzerinden en fazla {max_online_party} kisi icin "
            "rezervasyon yapilabilir. Lutfen restoranla dogrudan gorunun.",
            code="party_too_large",
        )
    if party_size < int(table["seats_min"]) or party_size > int(table["seats_max"]):
        raise ReservationError(
            f"Bu masa {table['seats_min']}–{table['seats_max']} kisi icin uygun."
        )
    if reserved_at.tzinfo is None:
        reserved_at = reserved_at.replace(tzinfo=timezone.utc)
    if reserved_at <= _utcnow():
        raise ReservationError("Gecmis bir saat secilemez.")
    if table_is_reserved(db, restaurant_id=restaurant.id, table_id=table_id, reserved_at=reserved_at):
        raise ReservationError("Bu masa secilen saatte dolu.")
    try:
        phone = normalize_phone(customer_phone)
    except OrderError as exc:
        raise ReservationError(exc.message) from exc
    clean_name = (customer_name or "").strip()
    if len(clean_name) < 2:
        raise ReservationError("Ad soyad zorunlu.")

    row = RestaurantTableReservation(
        restaurant_id=restaurant.id,
        user_id=user.id,
        table_id=table_id,
        table_label=str(table["label"]),
        zone=str(table["zone"]),
        party_size=party_size,
        reserved_at=reserved_at,
        note=(note or "").strip() or None,
        customer_phone=phone,
        customer_name=clean_name,
        status=RestaurantTableReservationStatus.pending_restaurant,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def decide_reservation(
    db: Session,
    *,
    reservation_id: UUID,
    restaurant_id: UUID,
    decision: str,
    reject_reason: str | None = None,
) -> RestaurantTableReservation:
    row = db.scalar(
        select(RestaurantTableReservation).where(
            RestaurantTableReservation.id == reservation_id,
            RestaurantTableReservation.restaurant_id == restaurant_id,
        )
    )
    if not row:
        raise ReservationError("Rezervasyon bulunamadi.")
    if row.status != RestaurantTableReservationStatus.pending_restaurant:
        raise ReservationError("Bu rezervasyon zaten islendi.")
    now = _utcnow()
    if decision == "approved":
        row.status = RestaurantTableReservationStatus.approved_by_restaurant
        row.restaurant_decided_at = now
        row.customer_confirm_expires_at = now + timedelta(hours=CUSTOMER_CONFIRM_HOURS)
    elif decision == "rejected":
        row.status = RestaurantTableReservationStatus.rejected
        row.restaurant_decided_at = now
        row.reject_reason_text = (reject_reason or "").strip() or None
    else:
        raise ReservationError("Gecersiz karar.")
    db.commit()
    db.refresh(row)
    return row


def confirm_reservation_by_customer(
    db: Session,
    *,
    reservation_id: UUID,
    user_id: UUID,
) -> RestaurantTableReservation:
    row = db.scalar(
        select(RestaurantTableReservation).where(
            RestaurantTableReservation.id == reservation_id,
            RestaurantTableReservation.user_id == user_id,
        )
    )
    if not row:
        raise ReservationError("Rezervasyon bulunamadi.")
    if row.status != RestaurantTableReservationStatus.approved_by_restaurant:
        raise ReservationError("Onay bekleyen rezervasyon yok.")
    now = _utcnow()
    if row.customer_confirm_expires_at and now > row.customer_confirm_expires_at:
        row.status = RestaurantTableReservationStatus.expired
        db.commit()
        raise ReservationError("Onay suresi doldu.")
    row.status = RestaurantTableReservationStatus.confirmed
    row.customer_confirmed_at = now
    db.commit()
    db.refresh(row)
    return row


def list_panel_reservations(
    db: Session,
    *,
    restaurant_id: UUID,
    limit: int = 50,
) -> list[dict]:
    rows = db.scalars(
        select(RestaurantTableReservation)
        .where(RestaurantTableReservation.restaurant_id == restaurant_id)
        .order_by(RestaurantTableReservation.reserved_at.desc())
        .limit(limit)
    ).all()
    return [reservation_to_dict(row) for row in rows]


def get_user_reservation(
    db: Session,
    *,
    reservation_id: UUID,
    user_id: UUID,
) -> RestaurantTableReservation | None:
    return db.scalar(
        select(RestaurantTableReservation).where(
            RestaurantTableReservation.id == reservation_id,
            RestaurantTableReservation.user_id == user_id,
        )
    )


def list_user_reservations(db: Session, *, user_id: UUID, limit: int = 30) -> list[dict]:
    rows = db.execute(
        select(RestaurantTableReservation, Restaurant.name)
        .join(Restaurant, Restaurant.id == RestaurantTableReservation.restaurant_id)
        .where(RestaurantTableReservation.user_id == user_id)
        .order_by(RestaurantTableReservation.created_at.desc())
        .limit(limit)
    ).all()
    result: list[dict] = []
    for reservation, restaurant_name in rows:
        result.append(reservation_to_dict(reservation, restaurant_name=restaurant_name))
    return result


def reserved_table_ids_for_slot(
    db: Session,
    *,
    restaurant_id: UUID,
    reserved_at: datetime,
) -> set[str]:
    slot = _ensure_utc(reserved_at)
    blocked: set[str] = set()
    for row in _active_reservations_near(db, restaurant_id=restaurant_id, center=slot):
        if reservations_overlap(row.reserved_at, slot):
            blocked.add(str(row.table_id))
    return blocked


def raise_reservation_http(exc: ReservationError) -> None:
    code = status.HTTP_400_BAD_REQUEST
    if exc.code == "not_found":
        code = status.HTTP_404_NOT_FOUND
    elif exc.code == "forbidden":
        code = status.HTTP_403_FORBIDDEN
    raise HTTPException(status_code=code, detail=exc.message)


async def notify_new_table_reservation(
    db: Session,
    *,
    ownership: RestaurantOwnership,
    reservation: RestaurantTableReservation,
) -> None:
    from app.services.panel_notification_jobs import notify_new_reservation

    await notify_new_reservation(db, ownership=ownership, reservation=reservation)


async def notify_reservation_decided(
    db: Session,
    *,
    reservation: RestaurantTableReservation,
    restaurant: Restaurant,
) -> None:
    from app.services.user_notification_service import (
        notify_reservation_approved,
        notify_reservation_rejected,
    )

    if reservation.status == RestaurantTableReservationStatus.approved_by_restaurant:
        notify_reservation_approved(db, reservation=reservation, restaurant=restaurant)
    elif reservation.status == RestaurantTableReservationStatus.rejected:
        notify_reservation_rejected(db, reservation=reservation, restaurant=restaurant)

