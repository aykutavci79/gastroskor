from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Restaurant, User
from app.schemas.table_reservation import (
    FloorPlanRead,
    RestaurantReservationActiveResponse,
    TableReservationConfirm,
    TableReservationCreate,
    TableReservationListResponse,
    TableReservationRead,
)
from app.services.restaurant_orders import get_ownership_for_restaurant
from app.services.table_reservations import (
    ReservationError,
    confirm_reservation_by_customer,
    create_table_reservation,
    floor_plan_to_dict,
    get_published_plan,
    list_user_reservations,
    online_reservations_configured,
    raise_reservation_http,
    reservation_to_dict,
    reserved_table_ids_for_slot,
    notify_new_table_reservation,
)

router = APIRouter(tags=["reservations"])


def _load_user(db: Session, email: str) -> User:
    from app.api.v1.routes import load_authenticated_user_by_email

    return load_authenticated_user_by_email(db, email)


def _parse_reserved_at(raw: str) -> datetime:
    text = raw.strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(text)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="reserved_at ISO-8601 formatinda olmali.",
        ) from exc


@router.get(
    "/restaurants/{restaurant_id}/reservations/active",
    response_model=RestaurantReservationActiveResponse,
)
def get_restaurant_reservation_active(
    restaurant_id: UUID,
    reserved_at: str | None = Query(default=None),
    user_email: str | None = Query(default=None, min_length=3),
    db: Session = Depends(get_db),
):
    restaurant = db.get(Restaurant, restaurant_id)
    if not restaurant or not restaurant.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found")
    ownership = get_ownership_for_restaurant(db, restaurant_id)
    available = online_reservations_configured(ownership)
    plan_row = get_published_plan(db, restaurant_id=restaurant_id) if available else None
    floor_plan = floor_plan_to_dict(plan_row, published=True) if plan_row else None
    reserved_ids: list[str] = []
    if available and reserved_at:
        slot = _parse_reserved_at(reserved_at)
        reserved_ids = sorted(
            reserved_table_ids_for_slot(db, restaurant_id=restaurant_id, reserved_at=slot)
        )
    return RestaurantReservationActiveResponse(
        online_reservations_available=available,
        floor_plan=FloorPlanRead.model_validate(floor_plan) if floor_plan else None,
        reserved_table_ids=reserved_ids,
    )


@router.post(
    "/restaurants/{restaurant_id}/reservations",
    response_model=TableReservationRead,
    status_code=status.HTTP_201_CREATED,
)
async def post_restaurant_reservation(
    restaurant_id: UUID,
    payload: TableReservationCreate,
    db: Session = Depends(get_db),
):
    restaurant = db.get(Restaurant, restaurant_id)
    if not restaurant or not restaurant.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found")
    ownership = get_ownership_for_restaurant(db, restaurant_id)
    if not ownership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restoran paneli yok.")
    user = _load_user(db, payload.user_email)
    try:
        reservation = create_table_reservation(
            db,
            restaurant=restaurant,
            ownership=ownership,
            user=user,
            table_id=payload.table_id.strip(),
            party_size=payload.party_size,
            reserved_at=_parse_reserved_at(payload.reserved_at),
            note=payload.note,
            customer_phone=payload.customer_phone,
            customer_name=payload.customer_name,
        )
    except ReservationError as exc:
        raise_reservation_http(exc)
    await notify_new_table_reservation(db, ownership=ownership, reservation=reservation)
    return TableReservationRead.model_validate(reservation_to_dict(reservation, restaurant_name=restaurant.name))


@router.get("/users/me/reservations", response_model=TableReservationListResponse)
def get_my_reservations(
    user_email: str = Query(..., min_length=3),
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
):
    user = _load_user(db, user_email)
    items = list_user_reservations(db, user_id=user.id, limit=limit)
    return TableReservationListResponse(items=[TableReservationRead.model_validate(row) for row in items])


@router.post("/users/me/reservations/{reservation_id}/confirm", response_model=TableReservationRead)
def post_confirm_reservation(
    reservation_id: UUID,
    payload: TableReservationConfirm,
    db: Session = Depends(get_db),
):
    user = _load_user(db, payload.user_email)
    try:
        reservation = confirm_reservation_by_customer(db, reservation_id=reservation_id, user_id=user.id)
    except ReservationError as exc:
        raise_reservation_http(exc)
    restaurant = db.get(Restaurant, reservation.restaurant_id)
    return TableReservationRead.model_validate(
        reservation_to_dict(reservation, restaurant_name=restaurant.name if restaurant else None)
    )
