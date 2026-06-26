from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import RestaurantOwnership, RestaurantSubscription
from app.services.online_menu_discount import parse_menu_discount_percent
from app.services.promo_social import normalize_instagram


def subscription_allows_promo(subscription: RestaurantSubscription | None) -> bool:
    return subscription is not None and subscription.status in {"trial", "active"}


def promo_from_ownership(ownership: RestaurantOwnership) -> dict | None:
    if not subscription_allows_promo(ownership.subscription):
        return None
    has_courier = bool(ownership.promo_has_own_courier)
    promo_text = (ownership.promo_direct_order_text or "").strip() or None
    phone = (ownership.promo_direct_order_phone or "").strip() or None
    whatsapp = (ownership.promo_direct_order_whatsapp or "").strip() or None
    url = (ownership.promo_direct_order_url or "").strip() or None
    menu_image_url = (ownership.promo_menu_image_url or "").strip() or None
    card_cover_image_url = (ownership.promo_card_cover_image_url or "").strip() or None
    instagram_url = normalize_instagram(ownership.promo_instagram)
    if (
        not has_courier
        and not promo_text
        and not phone
        and not whatsapp
        and not url
        and not menu_image_url
        and not card_cover_image_url
        and not instagram_url
    ):
        return None
    discount_percent = parse_menu_discount_percent(promo_text)
    return {
        "has_own_courier": has_courier,
        "direct_order_text": promo_text,
        "direct_order_phone": phone,
        "direct_order_whatsapp": whatsapp,
        "direct_order_url": url,
        "menu_image_url": menu_image_url,
        "card_cover_image_url": card_cover_image_url,
        "instagram_url": instagram_url,
        "online_menu_discount_percent": discount_percent,
    }


def get_public_promo_for_restaurant(db: Session, restaurant_id: UUID) -> dict | None:
    ownership = db.scalar(
        select(RestaurantOwnership)
        .where(RestaurantOwnership.restaurant_id == restaurant_id)
        .options(selectinload(RestaurantOwnership.subscription))
        .limit(1)
    )
    if not ownership:
        return None
    return promo_from_ownership(ownership)


def promos_by_google_place_ids(db: Session, place_ids: list[str]) -> dict[str, dict]:
    if not place_ids:
        return {}
    rows = db.scalars(
        select(RestaurantOwnership)
        .where(RestaurantOwnership.google_place_id.in_(place_ids))
        .options(selectinload(RestaurantOwnership.subscription))
    ).all()
    out: dict[str, dict] = {}
    for row in rows:
        promo = promo_from_ownership(row)
        if promo:
            out[row.google_place_id] = promo
    return out


def promos_for_restaurant_ids(db: Session, restaurant_ids: list[UUID]) -> dict[str, dict]:
    if not restaurant_ids:
        return {}
    rows = db.scalars(
        select(RestaurantOwnership)
        .where(RestaurantOwnership.restaurant_id.in_(restaurant_ids))
        .options(selectinload(RestaurantOwnership.subscription))
    ).all()
    out: dict[str, dict] = {}
    for row in rows:
        promo = promo_from_ownership(row)
        if promo:
            out[str(row.restaurant_id)] = promo
    return out


def ownership_promo_as_dict(ownership: RestaurantOwnership) -> dict:
    subscription = ownership.subscription
    active = subscription_allows_promo(subscription)
    return {
        "subscription_active": active,
        "has_own_courier": bool(ownership.promo_has_own_courier),
        "online_orders_enabled": bool(ownership.online_orders_enabled),
        "online_order_category_tags": list(ownership.online_order_category_tags or []),
        "direct_order_text": ownership.promo_direct_order_text,
        "direct_order_phone": ownership.promo_direct_order_phone,
        "direct_order_whatsapp": ownership.promo_direct_order_whatsapp,
        "direct_order_url": ownership.promo_direct_order_url,
        "menu_image_url": ownership.promo_menu_image_url,
        "card_cover_image_url": ownership.promo_card_cover_image_url,
        "instagram": ownership.promo_instagram,
        "card_emoji": ownership.card_emoji,
        "public_preview": promo_from_ownership(ownership) if active else None,
    }
