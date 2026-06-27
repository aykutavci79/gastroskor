"""Panel test verisi — promo, menu, siparis sifirlama."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, selectinload

from app.models import RestaurantMenuItem, RestaurantOrder, RestaurantOwnership


def reset_ownership_public_data(
    db: Session,
    ownership: RestaurantOwnership,
    *,
    hide_from_public: bool = True,
) -> dict:
    restaurant_id = ownership.restaurant_id

    order_count = int(
        db.scalar(select(func.count(RestaurantOrder.id)).where(RestaurantOrder.restaurant_id == restaurant_id))
        or 0
    )
    menu_count = int(
        db.scalar(
            select(func.count(RestaurantMenuItem.id)).where(RestaurantMenuItem.ownership_id == ownership.id)
        )
        or 0
    )

    db.execute(delete(RestaurantOrder).where(RestaurantOrder.restaurant_id == restaurant_id))
    db.execute(delete(RestaurantMenuItem).where(RestaurantMenuItem.ownership_id == ownership.id))

    ownership.promo_has_own_courier = False
    ownership.online_orders_enabled = False
    ownership.online_order_hours = None
    ownership.promo_direct_order_text = None
    ownership.promo_direct_order_phone = None
    ownership.promo_direct_order_whatsapp = None
    ownership.promo_direct_order_url = None
    ownership.promo_menu_image_url = None
    ownership.promo_card_cover_image_url = None
    ownership.promo_instagram = None
    ownership.card_emoji = None

    subscription_lapsed = False
    if hide_from_public and ownership.subscription is not None:
        ownership.subscription.status = "lapsed"
        subscription_lapsed = True
        db.add(ownership.subscription)

    db.add(ownership)
    db.commit()

    restaurant_name = ownership.restaurant.name if ownership.restaurant else None
    return {
        "orders_deleted": order_count,
        "menu_items_deleted": menu_count,
        "hide_from_public": subscription_lapsed,
        "restaurant_name": restaurant_name,
    }


def load_ownership_for_reset(db: Session, ownership_id: UUID) -> RestaurantOwnership | None:
    return db.scalar(
        select(RestaurantOwnership)
        .where(RestaurantOwnership.id == ownership_id)
        .options(
            selectinload(RestaurantOwnership.subscription),
            selectinload(RestaurantOwnership.restaurant),
        )
    )


def load_ownership_by_place_id(db: Session, place_id: str) -> RestaurantOwnership | None:
    return db.scalar(
        select(RestaurantOwnership)
        .where(RestaurantOwnership.google_place_id == place_id.strip())
        .options(
            selectinload(RestaurantOwnership.subscription),
            selectinload(RestaurantOwnership.restaurant),
        )
    )
