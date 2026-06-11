"""Panel — sesli urun katalogu ile menu senkronu."""

from __future__ import annotations

from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.constants.voice_product_catalog import (
    VOICE_PRODUCTS,
    catalog_groups_payload,
    catalog_payload,
    get_voice_product,
    is_valid_voice_product_slug,
)
from app.models import RestaurantMenuItem, RestaurantOwnership
from app.services.restaurant_menu import (
    active_menu_items,
    create_menu_item,
    load_ownership_with_menu,
    update_menu_item,
)


def voice_menu_matches_for_ownership(
    ownership: RestaurantOwnership,
    *,
    product_slugs: set[str],
    price_max: float | None = None,
) -> list[dict]:
    matches: list[dict] = []
    for item in active_menu_items(ownership):
        slug = (item.voice_product_slug or "").strip().lower()
        if not slug or slug not in product_slugs:
            continue
        price = float(item.price_tl)
        if isinstance(item.price_tl, Decimal):
            price = float(item.price_tl)
        if price_max is not None and price > price_max:
            continue
        product = get_voice_product(slug)
        matches.append(
            {
                "voice_product_slug": slug,
                "label": product.label if product else item.name,
                "price_tl": round(price, 2),
                "menu_item_id": str(item.id),
            }
        )
    matches.sort(key=lambda row: row["price_tl"])
    return matches


def ownership_sells_voice_products(
    ownership: RestaurantOwnership,
    *,
    product_slugs: set[str],
    price_max: float | None = None,
) -> bool:
    return bool(voice_menu_matches_for_ownership(ownership, product_slugs=product_slugs, price_max=price_max))


def list_voice_offerings_state(ownership: RestaurantOwnership) -> list[dict]:
    by_slug: dict[str, RestaurantMenuItem] = {}
    for item in ownership.menu_items:
        slug = (item.voice_product_slug or "").strip().lower()
        if slug:
            by_slug[slug] = item

    rows: list[dict] = []
    for product in VOICE_PRODUCTS:
        item = by_slug.get(product.slug)
        price = None
        if item is not None:
            price = float(item.price_tl)
            if isinstance(item.price_tl, Decimal):
                price = float(item.price_tl)
        rows.append(
            {
                "slug": product.slug,
                "label": product.label,
                "search_group": product.search_group,
                "enabled": bool(item and item.is_active),
                "price_tl": round(price, 2) if price is not None else None,
                "menu_item_id": str(item.id) if item else None,
            }
        )
    return rows


def sync_voice_menu_offerings(
    db: Session,
    ownership: RestaurantOwnership,
    offerings: list[dict],
) -> list[dict]:
    if not offerings:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="En az bir urun satiri gerekli.")

    existing_by_slug: dict[str, RestaurantMenuItem] = {}
    for item in ownership.menu_items:
        slug = (item.voice_product_slug or "").strip().lower()
        if slug:
            existing_by_slug[slug] = item

    seen_slugs: set[str] = set()
    for row in offerings:
        slug = (row.get("slug") or "").strip().lower()
        if not slug:
            continue
        if slug in seen_slugs:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Tekrarlanan urun: {slug}")
        seen_slugs.add(slug)
        if not is_valid_voice_product_slug(slug):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Gecersiz urun: {slug}")

        enabled = bool(row.get("enabled"))
        product = get_voice_product(slug)
        assert product is not None

        if not enabled:
            item = existing_by_slug.get(slug)
            if item:
                update_menu_item(db, ownership, item.id, is_active=False)
            continue

        raw_price = row.get("price_tl")
        if raw_price is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{product.label} icin fiyat girin.",
            )
        price_tl = round(max(0, float(raw_price)), 2)
        if price_tl <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{product.label} fiyati sifirdan buyuk olmali.",
            )

        item = existing_by_slug.get(slug)
        if item:
            update_menu_item(
                db,
                ownership,
                item.id,
                name=product.label,
                price_tl=price_tl,
                is_active=True,
                voice_product_slug=slug,
            )
        else:
            create_menu_item(
                db,
                ownership,
                name=product.label,
                price_tl=price_tl,
                category=product.search_group,
                voice_product_slug=slug,
            )

    db.refresh(ownership)
    ownership = load_ownership_with_menu(db, ownership.id)
    assert ownership is not None
    return list_voice_offerings_state(ownership)


def voice_catalog_response() -> dict:
    return {
        "groups": catalog_groups_payload(),
        "products": catalog_payload(),
    }
