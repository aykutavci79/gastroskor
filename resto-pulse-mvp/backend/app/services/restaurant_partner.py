from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import RestaurantOwnership
from app.services.restaurant_menu import MENU_PREVIEW_LIMIT, public_menu_for_ownership
from app.services.restaurant_orders import online_orders_available
from app.services.restaurant_promo import promo_from_ownership, subscription_allows_promo


def partner_listing_for_ownership(ownership: RestaurantOwnership) -> dict:
    active = subscription_allows_promo(ownership.subscription)
    base = {"card_emoji": ownership.card_emoji}
    if not active:
        return {
            **base,
            "is_premium_partner": False,
            "online_orders_available": False,
            "promo": None,
            "menu_preview": [],
            "menu_item_count": 0,
        }
    menu_full = public_menu_for_ownership(ownership, preview=False)
    return {
        **base,
        "is_premium_partner": True,
        "online_orders_available": online_orders_available(ownership),
        "promo": promo_from_ownership(ownership),
        "menu_preview": menu_full[:MENU_PREVIEW_LIMIT],
        "menu_item_count": len(menu_full),
    }


def partner_listing_for_restaurant(db: Session, restaurant_id: UUID) -> dict:
    ownership = db.scalar(
        select(RestaurantOwnership)
        .where(RestaurantOwnership.restaurant_id == restaurant_id)
        .options(
            selectinload(RestaurantOwnership.subscription),
            selectinload(RestaurantOwnership.menu_items),
        )
        .limit(1)
    )
    if not ownership:
        return {
            "card_emoji": None,
            "is_premium_partner": False,
            "online_orders_available": False,
            "promo": None,
            "menu_preview": [],
            "menu_item_count": 0,
        }
    return partner_listing_for_ownership(ownership)


def partner_listings_for_restaurant_ids(db: Session, restaurant_ids: list[UUID]) -> dict[str, dict]:
    if not restaurant_ids:
        return {}
    rows = db.scalars(
        select(RestaurantOwnership)
        .where(RestaurantOwnership.restaurant_id.in_(restaurant_ids))
        .options(
            selectinload(RestaurantOwnership.subscription),
            selectinload(RestaurantOwnership.menu_items),
        )
    ).all()
    return {str(row.restaurant_id): partner_listing_for_ownership(row) for row in rows}


def partner_listings_by_google_place_ids(db: Session, place_ids: list[str]) -> dict[str, dict]:
    if not place_ids:
        return {}
    rows = db.scalars(
        select(RestaurantOwnership)
        .where(RestaurantOwnership.google_place_id.in_(place_ids))
        .options(
            selectinload(RestaurantOwnership.subscription),
            selectinload(RestaurantOwnership.menu_items),
        )
    ).all()
    return {
        row.google_place_id: {
            **partner_listing_for_ownership(row),
            "restaurant_id": str(row.restaurant_id),
        }
        for row in rows
    }


def merge_partner_into_row(row: dict, partner: dict | None) -> dict:
    if not partner:
        row["is_premium_partner"] = False
        row["online_orders_available"] = False
        row.setdefault("promo", None)
        row.setdefault("menu_preview", [])
        row.setdefault("menu_item_count", 0)
        row.setdefault("card_emoji", None)
        return row
    row["is_premium_partner"] = partner["is_premium_partner"]
    row["online_orders_available"] = partner.get("online_orders_available", False)
    row["promo"] = partner.get("promo")
    row["menu_preview"] = partner.get("menu_preview") or []
    row["menu_item_count"] = partner.get("menu_item_count") or 0
    row["card_emoji"] = partner.get("card_emoji")
    if partner.get("restaurant_id"):
        row["restaurant_id"] = partner["restaurant_id"]
    return row
