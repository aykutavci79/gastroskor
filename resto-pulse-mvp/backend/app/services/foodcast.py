"""FoodCast — yorumdan bagimsiz tabak fotografi akisi."""

from __future__ import annotations

from datetime import datetime, time, timezone
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.entities import FoodcastPhoto, FoodcastPhotoReport, Restaurant, User
from app.services.foodcast_image_storage import save_foodcast_image
from app.services.city_resolver import resolve_city_name
from app.services.gastro_score_ranking import haversine_meters
from app.services.restaurant_proximity import is_user_near_restaurant

FOODCAST_STRIP_LIMIT = 10
FOODCAST_FEED_MAX_LIMIT = 50
FOODCAST_MAX_PER_USER_PER_DAY = 8
MAX_DISH_NAME_LEN = 80
MAX_CAPTION_LEN = 200
AUTO_HIDE_REPORT_COUNT = 3
ISTANBUL_TZ = ZoneInfo("Europe/Istanbul")

VALID_REPORT_REASONS = frozenset({"inappropriate", "spam", "wrong_place", "other"})


class FoodcastError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def author_label_for_user(user: User | None) -> str:
    if not user:
        return "GastroSkor"
    if user.nickname and user.nickname.strip():
        return user.nickname.strip()
    if user.full_name and user.full_name.strip():
        parts = user.full_name.strip().split()
        if user.default_review_name_display == "masked" and len(parts) > 1:
            return f"{parts[0]} {parts[-1][0]}."
        return user.full_name.strip()
    return "GastroSkor üyesi"


def serialize_foodcast_photo(photo: FoodcastPhoto) -> dict:
    restaurant = photo.restaurant
    return {
        "id": str(photo.id),
        "image_url": photo.image_url,
        "dish_name": photo.dish_name,
        "caption": photo.caption,
        "restaurant_id": str(photo.restaurant_id),
        "restaurant_name": restaurant.name if restaurant else "Restoran",
        "author_label": author_label_for_user(photo.author),
        "created_at": photo.created_at,
    }


def list_foodcast_feed(
    db: Session,
    *,
    city: str = "Bursa",
    limit: int = FOODCAST_STRIP_LIMIT,
    offset: int = 0,
) -> dict:
    city_norm = resolve_city_name(city)
    limit = min(FOODCAST_FEED_MAX_LIMIT, max(1, limit))
    offset = max(0, offset)

    filters = [
        FoodcastPhoto.is_visible.is_(True),
        Restaurant.is_active.is_(True),
    ]
    if city_norm:
        city_folded = city_norm.lower()
        filters.append(
            or_(
                func.lower(Restaurant.city) == city_folded,
                func.lower(FoodcastPhoto.city) == city_folded,
            )
        )

    total_visible = (
        db.scalar(
            select(func.count(FoodcastPhoto.id))
            .join(Restaurant, FoodcastPhoto.restaurant_id == Restaurant.id)
            .where(*filters)
        )
        or 0
    )

    rows = db.scalars(
        select(FoodcastPhoto)
        .join(Restaurant, FoodcastPhoto.restaurant_id == Restaurant.id)
        .where(*filters)
        .options(selectinload(FoodcastPhoto.restaurant), selectinload(FoodcastPhoto.author))
        .order_by(FoodcastPhoto.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return {
        "city": city_norm or "Bursa",
        "items": [serialize_foodcast_photo(row) for row in rows],
        "total_visible": int(total_visible),
    }


def _assert_location_near_restaurant(
    restaurant: Restaurant,
    *,
    latitude: float,
    longitude: float,
) -> None:
    if restaurant.latitude is None or restaurant.longitude is None:
        raise FoodcastError("Bu restoran icin konum bilgisi yok; tabak paylasilamaz.")
    allowed, distance_m = is_user_near_restaurant(
        db,
        restaurant=restaurant,
        latitude=latitude,
        longitude=longitude,
    )
    if not allowed:
        raise FoodcastError(
            f"Tabak paylasmak icin restorana {CHECK_IN_MAX_DISTANCE_M} m icinde olmalisiniz "
            f"(su an ~{distance_m} m)."
        )


def _istanbul_day_utc_bounds() -> tuple[datetime, datetime]:
    today = datetime.now(ISTANBUL_TZ).date()
    start = datetime.combine(today, time.min, tzinfo=ISTANBUL_TZ).astimezone(timezone.utc)
    end = datetime.combine(today, time.max, tzinfo=ISTANBUL_TZ).astimezone(timezone.utc)
    return start, end


def _count_user_photos_today(db: Session, user_id: UUID) -> int:
    start, end = _istanbul_day_utc_bounds()
    return (
        db.scalar(
            select(func.count(FoodcastPhoto.id)).where(
                FoodcastPhoto.author_id == user_id,
                FoodcastPhoto.created_at >= start,
                FoodcastPhoto.created_at <= end,
            )
        )
        or 0
    )


async def create_foodcast_photo(
    db: Session,
    *,
    user: User,
    restaurant_id: UUID,
    dish_name: str,
    caption: str | None,
    latitude: float,
    longitude: float,
    file: UploadFile,
    skip_location_check: bool = False,
) -> FoodcastPhoto:
    restaurant = db.get(Restaurant, restaurant_id)
    if not restaurant or not restaurant.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restoran bulunamadi.")

    dish_clean = dish_name.strip()
    if not dish_clean:
        raise FoodcastError("Yemek adi zorunlu.")
    if len(dish_clean) > MAX_DISH_NAME_LEN:
        raise FoodcastError(f"Yemek adi en fazla {MAX_DISH_NAME_LEN} karakter olabilir.")

    caption_clean = (caption or "").strip() or None
    if caption_clean and len(caption_clean) > MAX_CAPTION_LEN:
        raise FoodcastError(f"Not en fazla {MAX_CAPTION_LEN} karakter olabilir.")

    if user.role != "admin":
        if _count_user_photos_today(db, user.id) >= FOODCAST_MAX_PER_USER_PER_DAY:
            raise FoodcastError(f"Gunluk en fazla {FOODCAST_MAX_PER_USER_PER_DAY} tabak paylasabilirsiniz.")
        if not skip_location_check:
            _assert_location_near_restaurant(restaurant, latitude=latitude, longitude=longitude)

    image_url = await save_foodcast_image(file)
    photo_city = resolve_city_name(restaurant.city or "Bursa")
    row = FoodcastPhoto(
        author_id=user.id,
        restaurant_id=restaurant.id,
        dish_name=dish_clean,
        caption=caption_clean,
        image_url=image_url,
        latitude=latitude,
        longitude=longitude,
        city=photo_city,
        is_visible=True,
        created_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row, attribute_names=["restaurant", "author"])
    return row


def report_foodcast_photo(
    db: Session,
    *,
    photo_id: UUID,
    reason: str,
    note: str | None,
    reporter: User | None,
    reporter_email: str | None,
) -> dict:
    if reason not in VALID_REPORT_REASONS:
        raise FoodcastError("Gecersiz bildirim nedeni.")

    photo = db.scalar(
        select(FoodcastPhoto)
        .where(FoodcastPhoto.id == photo_id, FoodcastPhoto.is_visible.is_(True))
        .options(selectinload(FoodcastPhoto.reports))
    )
    if not photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foto bulunamadi.")

    if reporter:
        existing = db.scalar(
            select(FoodcastPhotoReport.id).where(
                FoodcastPhotoReport.photo_id == photo_id,
                FoodcastPhotoReport.reporter_id == reporter.id,
            )
        )
        if existing:
            return {"ok": True, "message": "Bu fotoyu zaten bildirdiniz."}

    db.add(
        FoodcastPhotoReport(
            photo_id=photo_id,
            reporter_id=reporter.id if reporter else None,
            reporter_email=reporter_email.strip().lower() if reporter_email else None,
            reason=reason,
            note=(note or "").strip() or None,
            created_at=_utcnow(),
        )
    )
    db.commit()

    report_count = (
        db.scalar(select(func.count(FoodcastPhotoReport.id)).where(FoodcastPhotoReport.photo_id == photo_id)) or 0
    )
    if report_count >= AUTO_HIDE_REPORT_COUNT:
        photo.is_visible = False
        photo.hidden_at = _utcnow()
        photo.hidden_reason = "auto_reports"
        db.add(photo)
        db.commit()

    return {"ok": True, "message": "Bildiriminiz alindi. Tesekkurler."}


def hide_foodcast_photo_admin(db: Session, *, photo_id: UUID, reason: str = "admin") -> FoodcastPhoto:
    photo = db.get(FoodcastPhoto, photo_id)
    if not photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foto bulunamadi.")
    photo.is_visible = False
    photo.hidden_at = _utcnow()
    photo.hidden_reason = reason[:120]
    db.add(photo)
    db.commit()
    db.refresh(photo, attribute_names=["restaurant", "author"])
    return photo
