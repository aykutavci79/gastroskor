"""Online siparis — telefon ile, restoran panelden onay."""

from __future__ import annotations

import re
import zlib
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session, selectinload
from zoneinfo import ZoneInfo

from app.models.entities import (
    Restaurant,
    RestaurantMenuItem,
    RestaurantOrder,
    RestaurantOrderLine,
    RestaurantOrderStatus,
    RestaurantOwnership,
    Review,
    User,
)
from app.constants.order_reject_reasons import (
    build_reject_customer_message,
    reject_reason_label,
    validate_rejection_reason,
)
from app.services.order_phone_verification import user_has_verified_order_phone
from app.services.order_review import order_can_be_reviewed
from app.services.restaurant_trust_rating import meets_online_order_trust_rating
from app.services.phone_tr import normalize_tr_mobile
from app.services.restaurant_menu import active_menu_items
from app.services.restaurant_promo import subscription_allows_promo

ISTANBUL_TZ = ZoneInfo("Europe/Istanbul")


class OrderError(Exception):
    def __init__(self, message: str, *, code: str = "order") -> None:
        super().__init__(message)
        self.message = message
        self.code = code


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def istanbul_today() -> date:
    return datetime.now(ISTANBUL_TZ).date()


def format_order_number(order_day: date | None, daily_no: int | None) -> str | None:
    if order_day is None or daily_no is None:
        return None
    return f"{order_day.strftime('%d.%m.%Y')}-{daily_no:04d}"


def allocate_daily_order_number(db: Session, *, restaurant_id: UUID) -> tuple[date, int]:
    order_day = istanbul_today()
    lock_key = zlib.crc32(f"{restaurant_id}:{order_day.isoformat()}".encode()) & 0xFFFFFFFF
    db.execute(text("SELECT pg_advisory_xact_lock(:lock_key)"), {"lock_key": lock_key})
    current_max = db.scalar(
        select(func.coalesce(func.max(RestaurantOrder.daily_no), 0)).where(
            RestaurantOrder.restaurant_id == restaurant_id,
            RestaurantOrder.order_day == order_day,
        )
    )
    return order_day, int(current_max or 0) + 1


def count_accepted_orders(
    db: Session,
    *,
    restaurant_id: UUID,
    since: datetime | None = None,
) -> int:
    stmt = select(func.count(RestaurantOrder.id)).where(
        RestaurantOrder.restaurant_id == restaurant_id,
        RestaurantOrder.status == RestaurantOrderStatus.accepted,
    )
    if since is not None:
        stmt = stmt.where(RestaurantOrder.created_at >= since)
    return int(db.scalar(stmt) or 0)


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


def customer_online_orders_available(db: Session, ownership: RestaurantOwnership | None) -> bool:
    if not online_orders_available(ownership):
        return False
    assert ownership is not None
    return meets_online_order_trust_rating(db, ownership.restaurant_id)


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
    reject_code = order.reject_reason_code
    reject_text = order.reject_reason_text
    return {
        "id": str(order.id),
        "restaurant_id": str(order.restaurant_id),
        "restaurant_name": restaurant_name,
        "status": order.status.value if isinstance(order.status, RestaurantOrderStatus) else str(order.status),
        "customer_phone": order.customer_phone,
        "customer_name": order.customer_name,
        "customer_address": order.customer_address,
        "order_day": order.order_day.isoformat() if order.order_day else None,
        "daily_no": order.daily_no,
        "order_number": format_order_number(order.order_day, order.daily_no),
        "note": order.note,
        "total_tl": round(float(total), 2),
        "lines": [order_line_to_dict(line) for line in order.lines],
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "decided_at": order.decided_at.isoformat() if order.decided_at else None,
        "reject_reason_code": reject_code,
        "reject_reason_label": reject_reason_label(reject_code),
        "reject_reason_text": reject_text,
        "reject_message": build_reject_customer_message(reason_code=reject_code, reason_text=reject_text)
        if order.status == RestaurantOrderStatus.rejected
        else None,
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


def get_recent_rejected_order_for_user(
    db: Session,
    *,
    user_id: UUID,
    restaurant_id: UUID,
    within_hours: int = 72,
) -> RestaurantOrder | None:
    cutoff = _utcnow() - timedelta(hours=within_hours)
    return db.scalar(
        select(RestaurantOrder)
        .where(
            RestaurantOrder.user_id == user_id,
            RestaurantOrder.restaurant_id == restaurant_id,
            RestaurantOrder.status == RestaurantOrderStatus.rejected,
            RestaurantOrder.decided_at.is_not(None),
            RestaurantOrder.decided_at >= cutoff,
        )
        .options(selectinload(RestaurantOrder.lines))
        .order_by(RestaurantOrder.decided_at.desc())
        .limit(1)
    )


def create_restaurant_order(
    db: Session,
    *,
    restaurant_id: UUID,
    user: User,
    customer_phone: str,
    customer_address: str,
    customer_name: str | None,
    note: str | None,
    lines: list[dict],
) -> RestaurantOrder:
    ownership = get_ownership_for_restaurant(db, restaurant_id)
    if not online_orders_available(ownership):
        raise OrderError("Bu restoran su an online siparis kabul etmiyor.")
    if not meets_online_order_trust_rating(db, restaurant_id):
        raise OrderError("Bu restoran online siparis icin minimum 3.0 puan sartini karsilamiyor.")

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

    phone = normalize_tr_mobile(customer_phone)
    if not phone:
        raise OrderError("Gecerli bir cep telefonu girin (05xx xxx xx xx).", code="invalid_phone")
    if not user_has_verified_order_phone(user, phone):
        raise OrderError(
            "Siparis vermek icin telefon numaranizi SMS ile dogrulayin.",
            code="phone_not_verified",
        )
    clean_address = customer_address.strip()
    if len(clean_address) < 10:
        raise OrderError("Teslimat adresini girin (en az 10 karakter).")
    if len(clean_address) > 500:
        raise OrderError("Adres en fazla 500 karakter olabilir.")
    display_name = (customer_name or user.nickname or user.full_name or "").strip() or None
    clean_note = (note or "").strip() or None

    order_day, daily_no = allocate_daily_order_number(db, restaurant_id=restaurant_id)

    total = 0.0
    order = RestaurantOrder(
        restaurant_id=restaurant_id,
        user_id=user.id,
        customer_phone=phone,
        customer_name=display_name,
        customer_address=clean_address,
        order_day=order_day,
        daily_no=daily_no,
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
    reject_reason_code: str | None = None,
    reject_reason_text: str | None = None,
) -> RestaurantOrder:
    if decision not in {"accepted", "rejected"}:
        raise OrderError("Gecersiz karar.")

    order = db.scalar(
        select(RestaurantOrder)
        .where(
            RestaurantOrder.id == order_id,
            RestaurantOrder.restaurant_id == ownership.restaurant_id,
        )
        .options(
            selectinload(RestaurantOrder.lines),
            selectinload(RestaurantOrder.restaurant),
            selectinload(RestaurantOrder.user),
        )
    )
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Siparis bulunamadi.")
    if order.status != RestaurantOrderStatus.pending:
        raise OrderError("Bu siparis zaten sonuclandirildi.")

    clean_code: str | None = None
    clean_text: str | None = None
    if decision == "rejected":
        try:
            clean_code, clean_text = validate_rejection_reason(
                reason_code=reject_reason_code,
                reason_text=reject_reason_text,
            )
        except ValueError as exc:
            raise OrderError(str(exc)) from exc
        order.reject_reason_code = clean_code
        order.reject_reason_text = clean_text
    else:
        order.reject_reason_code = None
        order.reject_reason_text = None

    order.status = (
        RestaurantOrderStatus.accepted if decision == "accepted" else RestaurantOrderStatus.rejected
    )
    order.decided_at = _utcnow()
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def count_pending_orders_for_user(db: Session, *, user_id: UUID) -> int:
    return int(
        db.scalar(
            select(func.count(RestaurantOrder.id)).where(
                RestaurantOrder.user_id == user_id,
                RestaurantOrder.status == RestaurantOrderStatus.pending,
            )
        )
        or 0
    )


def list_user_orders(
    db: Session,
    *,
    user_id: UUID,
    limit: int = 30,
    offset: int = 0,
) -> tuple[list[dict], int, int]:
    safe_limit = max(1, min(int(limit), 50))
    safe_offset = max(0, int(offset))
    base_filter = RestaurantOrder.user_id == user_id

    total = int(db.scalar(select(func.count(RestaurantOrder.id)).where(base_filter)) or 0)
    pending_count = count_pending_orders_for_user(db, user_id=user_id)

    rows = db.scalars(
        select(RestaurantOrder)
        .where(base_filter)
        .options(selectinload(RestaurantOrder.lines), selectinload(RestaurantOrder.restaurant))
        .order_by(RestaurantOrder.created_at.desc())
        .offset(safe_offset)
        .limit(safe_limit)
    ).all()

    order_ids = [row.id for row in rows]
    review_by_order: dict[UUID, Review] = {}
    if order_ids:
        for review in db.scalars(select(Review).where(Review.restaurant_order_id.in_(order_ids))).all():
            if review.restaurant_order_id:
                review_by_order[review.restaurant_order_id] = review

    items = []
    for row in rows:
        linked = review_by_order.get(row.id)
        payload = order_to_dict(row, restaurant_name=row.restaurant.name if row.restaurant else None)
        payload["has_review"] = linked is not None
        payload["can_review"] = order_can_be_reviewed(row) and linked is None
        payload["review_id"] = str(linked.id) if linked else None
        items.append(payload)
    return items, pending_count, total


def list_panel_orders(
    db: Session,
    *,
    restaurant_id: UUID,
    limit: int = 100,
    since_days: int = 7,
) -> list[dict]:
    stmt = (
        select(RestaurantOrder)
        .where(RestaurantOrder.restaurant_id == restaurant_id)
        .options(selectinload(RestaurantOrder.lines), selectinload(RestaurantOrder.restaurant))
        .order_by(RestaurantOrder.created_at.desc())
        .limit(limit)
    )
    if since_days > 0:
        cutoff = _utcnow() - timedelta(days=since_days)
        stmt = stmt.where(RestaurantOrder.created_at >= cutoff)
    rows = db.scalars(stmt).all()
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
