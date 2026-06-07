"""Online siparis — telefon ile, restoran panelden onay."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.entities import (
    Restaurant,
    RestaurantMenuItem,
    RestaurantOrder,
    RestaurantOrderLine,
    RestaurantOrderStatus,
    RestaurantOwnership,
    User,
)
from app.services.restaurant_menu import active_menu_items
from app.services.restaurant_promo import subscription_allows_promo


class OrderError(Exception):
    def __init__(self, message: str, *, code: str = "order") -> None:
        super().__init__(message)
        self.message = message
        self.code = code


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def normalize_phone(value: str) -> str:
    digits = re.sub(r"\D", "", value.strip())
    if len(digits) < 10:
        raise OrderError("Gecerli bir telefon numarasi girin (en az 10 hane).")
    if digits.startswith("90") and len(digits) >= 12:
        return f"+{digits}"
    if digits.startswith("0") and len(digits) == 11:
        return f"+90{digits[1:]}"
    if len(digits) == 10:
        return f"+90{digits}"
    return f"+{digits}" if value.strip().startswith("+") else digits


def get_ownership_for_restaurant(db: Session, restaurant_id: UUID) -> RestaurantOwnership | None:
    return db.scalar(
        select(RestaurantOwnership)
        .where(RestaurantOwnership.restaurant_id == restaurant_id)
        .options(
            selectinload(RestaurantOwnership.subscription),
            selectinload(RestaurantOwnership.menu_items),
            selectinload(RestaurantOwnership.restaurant),
        )
        .limit(1)
    )


def online_orders_available(ownership: RestaurantOwnership | None) -> bool:
    if not ownership:
        return False
    if not subscription_allows_promo(ownership.subscription):
        return False
    if not ownership.promo_has_own_courier:
        return False
    if not ownership.online_orders_enabled:
        return False
    return len(active_menu_items(ownership)) > 0


def order_line_to_dict(line: RestaurantOrderLine) -> dict:
    price = float(line.price_snapshot)
    qty = int(line.quantity)
    return {
        "id": str(line.id),
        "menu_item_id": str(line.menu_item_id) if line.menu_item_id else None,
        "name": line.name_snapshot,
        "price_tl": round(price, 2),
        "quantity": qty,
        "line_total_tl": round(price * qty, 2),
    }


def order_to_dict(order: RestaurantOrder, *, restaurant_name: str | None = None) -> dict:
    total = order.total_tl
    if isinstance(total, Decimal):
        total = float(total)
    return {
        "id": str(order.id),
        "restaurant_id": str(order.restaurant_id),
        "restaurant_name": restaurant_name,
        "status": order.status.value if isinstance(order.status, RestaurantOrderStatus) else str(order.status),
        "customer_phone": order.customer_phone,
        "customer_name": order.customer_name,
        "note": order.note,
        "total_tl": round(float(total), 2),
        "lines": [order_line_to_dict(line) for line in order.lines],
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "decided_at": order.decided_at.isoformat() if order.decided_at else None,
    }


def get_pending_order_for_user(
    db: Session, *, user_id: UUID, restaurant_id: UUID
) -> RestaurantOrder | None:
    return db.scalar(
        select(RestaurantOrder)
        .where(
            RestaurantOrder.user_id == user_id,
            RestaurantOrder.restaurant_id == restaurant_id,
            RestaurantOrder.status == RestaurantOrderStatus.pending,
        )
        .options(selectinload(RestaurantOrder.lines))
        .limit(1)
    )


def create_restaurant_order(
    db: Session,
    *,
    restaurant_id: UUID,
    user: User,
    customer_phone: str,
    customer_name: str | None,
    note: str | None,
    lines: list[dict],
) -> RestaurantOrder:
    ownership = get_ownership_for_restaurant(db, restaurant_id)
    if not online_orders_available(ownership):
        raise OrderError("Bu restoran su an online siparis kabul etmiyor.")

    assert ownership is not None
    if get_pending_order_for_user(db, user_id=user.id, restaurant_id=restaurant_id):
        raise OrderError(
            "Onay bekleyen siparisin var. Restoran onaylayana veya reddedene kadar yeni siparis veremezsin.",
            code="pending_exists",
        )

    menu_by_id = {str(item.id): item for item in active_menu_items(ownership)}
    if not menu_by_id:
        raise OrderError("Restoran menusu bos.")

    parsed_lines: list[tuple[RestaurantMenuItem, int]] = []
    for row in lines:
        item_id = str(row.get("menu_item_id", "")).strip()
        qty = int(row.get("quantity") or 0)
        if qty < 1 or qty > 99:
            raise OrderError("Gecersiz urun adedi.")
        menu_item = menu_by_id.get(item_id)
        if not menu_item:
            raise OrderError("Menu listesi guncellendi. Sayfayi yenileyip tekrar deneyin.")
        parsed_lines.append((menu_item, qty))

    phone = normalize_phone(customer_phone)
    display_name = (customer_name or user.nickname or user.full_name or "").strip() or None
    clean_note = (note or "").strip() or None

    total = 0.0
    order = RestaurantOrder(
        restaurant_id=restaurant_id,
        user_id=user.id,
        customer_phone=phone,
        customer_name=display_name,
        note=clean_note,
        status=RestaurantOrderStatus.pending,
        total_tl=0,
    )
    db.add(order)
    db.flush()

    for menu_item, qty in parsed_lines:
        price = float(menu_item.price_tl)
        total += price * qty
        db.add(
            RestaurantOrderLine(
                order_id=order.id,
                menu_item_id=menu_item.id,
                name_snapshot=menu_item.name,
                price_snapshot=round(price, 2),
                quantity=qty,
            )
        )

    order.total_tl = round(total, 2)
    db.add(order)
    db.commit()
    db.refresh(order)
    order = db.scalar(
        select(RestaurantOrder)
        .where(RestaurantOrder.id == order.id)
        .options(selectinload(RestaurantOrder.lines))
    )
    assert order is not None
    return order


def decide_restaurant_order(
    db: Session,
    *,
    ownership: RestaurantOwnership,
    order_id: UUID,
    decision: str,
) -> RestaurantOrder:
    if decision not in {"accepted", "rejected"}:
        raise OrderError("Gecersiz karar.")

    order = db.scalar(
        select(RestaurantOrder)
        .where(
            RestaurantOrder.id == order_id,
            RestaurantOrder.restaurant_id == ownership.restaurant_id,
        )
        .options(selectinload(RestaurantOrder.lines), selectinload(RestaurantOrder.restaurant))
    )
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Siparis bulunamadi.")
    if order.status != RestaurantOrderStatus.pending:
        raise OrderError("Bu siparis zaten sonuclandirildi.")

    order.status = (
        RestaurantOrderStatus.accepted if decision == "accepted" else RestaurantOrderStatus.rejected
    )
    order.decided_at = _utcnow()
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def list_panel_orders(db: Session, *, restaurant_id: UUID, limit: int = 50) -> list[dict]:
    rows = db.scalars(
        select(RestaurantOrder)
        .where(RestaurantOrder.restaurant_id == restaurant_id)
        .options(selectinload(RestaurantOrder.lines), selectinload(RestaurantOrder.restaurant))
        .order_by(RestaurantOrder.created_at.desc())
        .limit(limit)
    ).all()
    return [
        order_to_dict(row, restaurant_name=row.restaurant.name if row.restaurant else None) for row in rows
    ]


async def notify_new_restaurant_order(
    db: Session,
    *,
    ownership: RestaurantOwnership,
    order: RestaurantOrder,
) -> None:
    from app.services.panel_notification_jobs import notify_new_online_order

    await notify_new_online_order(db, ownership=ownership, order=order)


def raise_order_http(exc: OrderError) -> None:
    status_code = status.HTTP_409_CONFLICT if exc.code == "pending_exists" else status.HTTP_422_UNPROCESSABLE_ENTITY
    raise HTTPException(
        status_code=status_code,
        detail={"code": exc.code, "message": exc.message},
    ) from exc
