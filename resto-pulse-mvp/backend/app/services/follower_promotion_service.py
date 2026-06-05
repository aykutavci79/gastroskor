from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    FollowerCoupon,
    FollowerPromotion,
    Restaurant,
    RestaurantOwnership,
    User,
    UserRestaurantFollow,
)
from app.services.restaurant_follow import is_following
from app.services.restaurant_promo import subscription_allows_promo


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _generate_coupon_code(db: Session) -> str:
    for _ in range(12):
        code = f"GS-{secrets.token_hex(4).upper()}"
        exists = db.scalar(select(FollowerCoupon.id).where(FollowerCoupon.code == code))
        if not exists:
            return code
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Benzersiz kupon kodu uretilemedi.",
    )


def _normalize_code(code: str) -> str:
    return code.strip().upper().replace(" ", "")


def coupon_to_dict(coupon: FollowerCoupon, *, restaurant_name: str | None = None) -> dict:
    promo = coupon.promotion
    return {
        "id": str(coupon.id),
        "promotion_id": str(coupon.promotion_id),
        "restaurant_id": str(coupon.restaurant_id),
        "restaurant_name": restaurant_name,
        "code": coupon.code,
        "discount_percent": promo.discount_percent if promo else 0,
        "status": _effective_coupon_status(coupon),
        "expires_at": coupon.expires_at,
        "redeemed_at": coupon.redeemed_at,
        "title": promo.title if promo else None,
    }


def _effective_coupon_status(coupon: FollowerCoupon) -> str:
    if coupon.status == "redeemed":
        return "redeemed"
    if coupon.expires_at <= _utcnow():
        return "expired"
    return coupon.status


def _expire_stale_coupons(db: Session, coupon: FollowerCoupon) -> None:
    if coupon.status == "issued" and coupon.expires_at <= _utcnow():
        coupon.status = "expired"
        db.add(coupon)


def promotion_stats(db: Session, promotion_id: UUID) -> tuple[int, int]:
    issued = (
        db.scalar(select(func.count(FollowerCoupon.id)).where(FollowerCoupon.promotion_id == promotion_id)) or 0
    )
    redeemed = (
        db.scalar(
            select(func.count(FollowerCoupon.id)).where(
                FollowerCoupon.promotion_id == promotion_id,
                FollowerCoupon.status == "redeemed",
            )
        )
        or 0
    )
    return int(issued), int(redeemed)


def promotion_to_dict(db: Session, promo: FollowerPromotion) -> dict:
    issued, redeemed = promotion_stats(db, promo.id)
    return {
        "id": str(promo.id),
        "restaurant_id": str(promo.restaurant_id),
        "title": promo.title,
        "discount_percent": promo.discount_percent,
        "valid_until": promo.valid_until,
        "max_coupons": promo.max_coupons,
        "issued_count": issued,
        "redeemed_count": redeemed,
        "status": promo.status,
        "created_at": promo.created_at,
    }


def _require_promo_ownership(db: Session, ownership: RestaurantOwnership) -> None:
    if not subscription_allows_promo(ownership.subscription):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Takipci kuponu icin aktif uyelik gerekir.",
        )


def _active_promotions_for_restaurant(db: Session, restaurant_id: UUID) -> list[FollowerPromotion]:
    now = _utcnow()
    return list(
        db.scalars(
            select(FollowerPromotion).where(
                FollowerPromotion.restaurant_id == restaurant_id,
                FollowerPromotion.status == "active",
                FollowerPromotion.valid_until > now,
            )
        ).all()
    )


def issue_coupon_for_follower(
    db: Session,
    *,
    restaurant_id: UUID,
    user_id: UUID,
) -> FollowerCoupon | None:
    if not is_following(db, user_id=user_id, restaurant_id=restaurant_id):
        return None

    for promo in _active_promotions_for_restaurant(db, restaurant_id):
        issued, _ = promotion_stats(db, promo.id)
        if issued >= promo.max_coupons:
            continue
        existing = db.scalar(
            select(FollowerCoupon).where(
                FollowerCoupon.promotion_id == promo.id,
                FollowerCoupon.user_id == user_id,
            )
        )
        if existing:
            continue
        coupon = FollowerCoupon(
            promotion_id=promo.id,
            user_id=user_id,
            restaurant_id=restaurant_id,
            code=_generate_coupon_code(db),
            status="issued",
            expires_at=promo.valid_until,
        )
        db.add(coupon)
        db.flush()
        return coupon
    return None


def _issue_coupons_batch(db: Session, promo: FollowerPromotion) -> list[FollowerCoupon]:
    issued, _ = promotion_stats(db, promo.id)
    remaining = max(0, promo.max_coupons - issued)
    if remaining == 0:
        return []

    follower_ids = db.scalars(
        select(UserRestaurantFollow.user_id)
        .where(UserRestaurantFollow.restaurant_id == promo.restaurant_id)
        .order_by(UserRestaurantFollow.created_at.asc())
    ).all()

    created_rows: list[FollowerCoupon] = []
    for user_id in follower_ids:
        if len(created_rows) >= remaining:
            break
        existing = db.scalar(
            select(FollowerCoupon.id).where(
                FollowerCoupon.promotion_id == promo.id,
                FollowerCoupon.user_id == user_id,
            )
        )
        if existing:
            continue
        coupon = FollowerCoupon(
            promotion_id=promo.id,
            user_id=user_id,
            restaurant_id=promo.restaurant_id,
            code=_generate_coupon_code(db),
            status="issued",
            expires_at=promo.valid_until,
        )
        db.add(coupon)
        created_rows.append(coupon)
    return created_rows


def create_follower_promotion(
    db: Session,
    *,
    ownership: RestaurantOwnership,
    title: str,
    discount_percent: int,
    valid_days: int,
    max_coupons: int,
) -> FollowerPromotion:
    _require_promo_ownership(db, ownership)
    valid_until = _utcnow() + timedelta(days=valid_days)
    promo = FollowerPromotion(
        ownership_id=ownership.id,
        restaurant_id=ownership.restaurant_id,
        title=title.strip() or "Takipçi indirimi",
        discount_percent=discount_percent,
        valid_until=valid_until,
        max_coupons=max_coupons,
        status="active",
    )
    db.add(promo)
    db.flush()
    new_coupons = _issue_coupons_batch(db, promo)
    db.commit()
    db.refresh(promo)
    return promo, new_coupons


def list_promotions_for_ownership(db: Session, ownership_id: UUID) -> list[dict]:
    promos = db.scalars(
        select(FollowerPromotion)
        .where(FollowerPromotion.ownership_id == ownership_id)
        .order_by(FollowerPromotion.created_at.desc())
    ).all()
    return [promotion_to_dict(db, row) for row in promos]


def get_user_coupon_at_restaurant(
    db: Session,
    *,
    user_id: UUID,
    restaurant_id: UUID,
) -> dict | None:
    if not is_following(db, user_id=user_id, restaurant_id=restaurant_id):
        return None

    coupon = db.scalars(
        select(FollowerCoupon)
        .where(
            FollowerCoupon.user_id == user_id,
            FollowerCoupon.restaurant_id == restaurant_id,
            FollowerCoupon.status == "issued",
            FollowerCoupon.expires_at > _utcnow(),
        )
        .options(selectinload(FollowerCoupon.promotion))
        .order_by(FollowerCoupon.created_at.desc())
        .limit(1)
    ).first()
    if not coupon:
        return None
    restaurant = db.get(Restaurant, restaurant_id)
    return coupon_to_dict(coupon, restaurant_name=restaurant.name if restaurant else None)


def list_user_coupons(db: Session, *, user_id: UUID, limit: int = 50) -> list[dict]:
    coupons = db.scalars(
        select(FollowerCoupon)
        .where(FollowerCoupon.user_id == user_id)
        .options(selectinload(FollowerCoupon.promotion), selectinload(FollowerCoupon.restaurant))
        .order_by(FollowerCoupon.created_at.desc())
        .limit(limit)
    ).all()
    result: list[dict] = []
    for coupon in coupons:
        _expire_stale_coupons(db, coupon)
        if _effective_coupon_status(coupon) == "issued":
            result.append(
                coupon_to_dict(
                    coupon,
                    restaurant_name=coupon.restaurant.name if coupon.restaurant else None,
                )
            )
    db.commit()
    return result


def redeem_follower_coupon(
    db: Session,
    *,
    ownership: RestaurantOwnership,
    actor_user_id: UUID,
    code: str,
) -> tuple[FollowerCoupon, str]:
    _require_promo_ownership(db, ownership)
    normalized = _normalize_code(code)
    coupon = db.scalar(
        select(FollowerCoupon)
        .where(FollowerCoupon.code == normalized)
        .options(selectinload(FollowerCoupon.promotion), selectinload(FollowerCoupon.restaurant))
    )
    if not coupon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kupon bulunamadi.")

    if coupon.restaurant_id != ownership.restaurant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu kupon baska bir isletmeye ait.",
        )

    _expire_stale_coupons(db, coupon)
    status_now = _effective_coupon_status(coupon)
    if status_now == "redeemed":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Kupon zaten kullanildi.")
    if status_now == "expired":
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Kupon suresi dolmus.")

    coupon.status = "redeemed"
    coupon.redeemed_at = _utcnow()
    coupon.redeemed_by_user_id = actor_user_id
    db.add(coupon)
    db.commit()
    db.refresh(coupon)

    restaurant_name = coupon.restaurant.name if coupon.restaurant else "İşletme"
    message = f"%{coupon.promotion.discount_percent} indirim kuponu kullanildi — {restaurant_name}."
    return coupon, message
