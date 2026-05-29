from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import RestaurantMenuItem, RestaurantOwnership
from app.services.restaurant_promo import subscription_allows_promo

MENU_PREVIEW_LIMIT = 3
MAX_MENU_ITEMS = 80


def menu_item_to_dict(item: RestaurantMenuItem) -> dict:
    price = item.price_tl
    if isinstance(price, Decimal):
        price = float(price)
    return {
        "id": str(item.id),
        "name": item.name,
        "price_tl": round(float(price), 2),
        "description": item.description,
        "category": item.category,
        "sort_order": item.sort_order,
        "is_active": item.is_active,
    }


def active_menu_items(ownership: RestaurantOwnership) -> list[RestaurantMenuItem]:
    return [row for row in ownership.menu_items if row.is_active]


def public_menu_for_ownership(ownership: RestaurantOwnership, *, preview: bool = False) -> list[dict]:
    if not subscription_allows_promo(ownership.subscription):
        return []
    items = sorted(active_menu_items(ownership), key=lambda row: (row.sort_order, row.name))
    if preview:
        items = items[:MENU_PREVIEW_LIMIT]
    return [menu_item_to_dict(row) for row in items]


def list_panel_menu(db: Session, ownership: RestaurantOwnership) -> list[dict]:
    rows = db.scalars(
        select(RestaurantMenuItem)
        .where(RestaurantMenuItem.ownership_id == ownership.id)
        .order_by(RestaurantMenuItem.sort_order.asc(), RestaurantMenuItem.name.asc())
    ).all()
    return [menu_item_to_dict(row) for row in rows]


def create_menu_item(
    db: Session,
    ownership: RestaurantOwnership,
    *,
    name: str,
    price_tl: float,
    description: str | None = None,
    category: str | None = None,
) -> RestaurantMenuItem:
    if not subscription_allows_promo(ownership.subscription):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Menu sadece aktif deneme veya abonelikte yayinlanir.",
        )
    count = db.scalar(
        select(func.count(RestaurantMenuItem.id)).where(RestaurantMenuItem.ownership_id == ownership.id)
    ) or 0
    if count >= MAX_MENU_ITEMS:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Menu limiti ({MAX_MENU_ITEMS}) doldu.")

    row = RestaurantMenuItem(
        ownership_id=ownership.id,
        name=name.strip(),
        price_tl=round(max(0, price_tl), 2),
        description=(description or "").strip() or None,
        category=(category or "").strip() or None,
        sort_order=count,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_menu_item(
    db: Session,
    ownership: RestaurantOwnership,
    item_id: UUID,
    *,
    name: str | None = None,
    price_tl: float | None = None,
    description: str | None = None,
    category: str | None = None,
    is_active: bool | None = None,
    sort_order: int | None = None,
) -> RestaurantMenuItem:
    row = db.get(RestaurantMenuItem, item_id)
    if not row or row.ownership_id != ownership.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu ogesi bulunamadi.")
    if name is not None:
        row.name = name.strip()
    if price_tl is not None:
        row.price_tl = round(max(0, price_tl), 2)
    if description is not None:
        row.description = description.strip() or None
    if category is not None:
        row.category = category.strip() or None
    if is_active is not None:
        row.is_active = is_active
    if sort_order is not None:
        row.sort_order = sort_order
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def delete_menu_item(db: Session, ownership: RestaurantOwnership, item_id: UUID) -> None:
    row = db.get(RestaurantMenuItem, item_id)
    if not row or row.ownership_id != ownership.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu ogesi bulunamadi.")
    db.delete(row)
    db.commit()


def load_ownership_with_menu(db: Session, ownership_id: UUID) -> RestaurantOwnership | None:
    return db.scalar(
        select(RestaurantOwnership)
        .where(RestaurantOwnership.id == ownership_id)
        .options(
            selectinload(RestaurantOwnership.subscription),
            selectinload(RestaurantOwnership.menu_items),
        )
    )
