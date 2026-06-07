"""Restoran check-in: konum zorunlu, gunluk tekil, benzersiz ziyaretci sayaci."""

from __future__ import annotations

from datetime import date, datetime, timezone
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.entities import Restaurant, RestaurantCheckIn
from app.services.gastro_score_ranking import haversine_meters

CHECK_IN_MAX_DISTANCE_M = 200
ISTANBUL_TZ = ZoneInfo("Europe/Istanbul")


class CheckInError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def istanbul_today() -> date:
    return datetime.now(ISTANBUL_TZ).date()


def visitor_counts_for_restaurants(db: Session, restaurant_ids: list[UUID]) -> dict[str, int]:
    if not restaurant_ids:
        return {}
    rows = db.execute(
        select(
            RestaurantCheckIn.restaurant_id,
            func.count(func.distinct(RestaurantCheckIn.user_id)),
        )
        .where(RestaurantCheckIn.restaurant_id.in_(restaurant_ids))
        .group_by(RestaurantCheckIn.restaurant_id)
    ).all()
    return {str(rid): int(cnt) for rid, cnt in rows}


def merge_check_in_counts_into_rows(db: Session, rows: list[dict], *, id_key: str = "id") -> None:
    ids: list[UUID] = []
    for row in rows:
        raw = row.get(id_key)
        if not raw:
            continue
        try:
            ids.append(UUID(str(raw)))
        except ValueError:
            continue
    counts = visitor_counts_for_restaurants(db, ids)
    for row in rows:
        raw = row.get(id_key)
        row["check_in_visitor_count"] = counts.get(str(raw), 0) if raw else 0


def visitor_count(db: Session, *, restaurant_id: UUID) -> int:
    return (
        db.scalar(
            select(func.count(func.distinct(RestaurantCheckIn.user_id))).where(
                RestaurantCheckIn.restaurant_id == restaurant_id
            )
        )
        or 0
    )


def get_user_check_in_status(
    db: Session,
    *,
    user_id: UUID | None,
    restaurant_id: UUID,
) -> dict:
    count = visitor_count(db, restaurant_id=restaurant_id)
    if not user_id:
        return {
            "visitor_count": count,
            "checked_in_today": False,
            "last_check_in_at": None,
        }

    today = istanbul_today()
    checked_today = db.scalar(
        select(RestaurantCheckIn.id).where(
            RestaurantCheckIn.user_id == user_id,
            RestaurantCheckIn.restaurant_id == restaurant_id,
            RestaurantCheckIn.check_in_date == today,
        )
    )
    last_at = db.scalar(
        select(RestaurantCheckIn.created_at)
        .where(
            RestaurantCheckIn.user_id == user_id,
            RestaurantCheckIn.restaurant_id == restaurant_id,
        )
        .order_by(RestaurantCheckIn.created_at.desc())
        .limit(1)
    )
    return {
        "visitor_count": count,
        "checked_in_today": checked_today is not None,
        "last_check_in_at": last_at,
    }


def create_check_in(
    db: Session,
    *,
    user_id: UUID,
    restaurant_id: UUID,
    latitude: float,
    longitude: float,
) -> dict:
    restaurant = db.get(Restaurant, restaurant_id)
    if not restaurant or not restaurant.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found")
    if restaurant.latitude is None or restaurant.longitude is None:
        raise CheckInError("Bu restoran icin konum bilgisi yok; check-in yapilamaz.")

    distance_m = haversine_meters(latitude, longitude, restaurant.latitude, restaurant.longitude)
    if distance_m > CHECK_IN_MAX_DISTANCE_M:
        raise CheckInError(
            f"Check-in icin restorana {CHECK_IN_MAX_DISTANCE_M} m icinde olmalisiniz "
            f"(su an ~{int(distance_m)} m)."
        )

    today = istanbul_today()
    existing = db.scalar(
        select(RestaurantCheckIn.id).where(
            RestaurantCheckIn.user_id == user_id,
            RestaurantCheckIn.restaurant_id == restaurant_id,
            RestaurantCheckIn.check_in_date == today,
        )
    )
    if existing:
        raise CheckInError("Bugun bu restorana zaten check-in yaptiniz.")

    row = RestaurantCheckIn(
        user_id=user_id,
        restaurant_id=restaurant_id,
        latitude=latitude,
        longitude=longitude,
        check_in_date=today,
        created_at=_utcnow(),
    )
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise CheckInError("Bugun bu restorana zaten check-in yaptiniz.") from None
    db.refresh(row)
    return {
        "check_in_id": str(row.id),
        "created_at": row.created_at,
        "visitor_count": visitor_count(db, restaurant_id=restaurant_id),
    }
