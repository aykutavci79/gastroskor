from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.entities import User
from app.schemas.foodcast import (
    FoodcastFeedResponse,
    FoodcastPhotoCreateResponse,
    FoodcastPhotoItem,
    FoodcastReportCreate,
    FoodcastReportResult,
)
from app.services.foodcast import (
    FOODCAST_FEED_MAX_LIMIT,
    FOODCAST_STRIP_LIMIT,
    FoodcastError,
    create_foodcast_photo,
    hide_foodcast_photo_admin,
    list_foodcast_feed,
    report_foodcast_photo,
    serialize_foodcast_photo,
)
from app.services.request_identity import get_request_auth
from app.services.restaurant_claim import ensure_restaurant_for_place

router = APIRouter(prefix="/foodcast", tags=["foodcast"])


def _resolve_user_by_email(db: Session, email: str) -> User:
    user = db.scalar(select(User).where(User.email == email.strip().lower()).limit(1))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kullanici bulunamadi.")
    return user


def _resolve_upload_user(db: Session, author_email: str) -> User:
    auth = get_request_auth()
    if auth is not None:
        user = db.get(User, auth.user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kullanici bulunamadi.")
        if author_email.strip().lower() != auth.email:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Oturum ile uyusmayan e-posta.")
        return user
    return _resolve_user_by_email(db, author_email)


@router.get("/feed", response_model=FoodcastFeedResponse)
def foodcast_feed(
    city: str = Query(default="Bursa", min_length=2, max_length=120),
    limit: int = Query(default=FOODCAST_STRIP_LIMIT, ge=1, le=FOODCAST_FEED_MAX_LIMIT),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    return list_foodcast_feed(db, city=city, limit=limit, offset=offset)


@router.post("/photos", response_model=FoodcastPhotoCreateResponse, status_code=status.HTTP_201_CREATED)
async def upload_foodcast_photo(
    author_email: str = Form(...),
    restaurant_id: str | None = Form(default=None),
    google_place_id: str | None = Form(default=None),
    city: str = Form(default="Bursa"),
    dish_name: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    caption: str | None = Form(default=None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    rid = (restaurant_id or "").strip()
    place_id = (google_place_id or "").strip()
    if place_id and not rid:
        restaurant = await ensure_restaurant_for_place(db, place_id=place_id, city=city.strip() or "Bursa")
        db.commit()
        db.refresh(restaurant)
        restaurant_uuid = restaurant.id
    elif rid:
        try:
            restaurant_uuid = UUID(rid)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Gecersiz restoran id.") from exc
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Restoran secimi veya Google mekan kimligi gerekli.",
        )

    user = _resolve_upload_user(db, author_email)
    skip_location = user.role == "admin"
    try:
        photo = await create_foodcast_photo(
            db,
            user=user,
            restaurant_id=restaurant_uuid,
            dish_name=dish_name,
            caption=caption,
            latitude=latitude,
            longitude=longitude,
            file=file,
            skip_location_check=skip_location,
        )
    except FoodcastError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "foodcast", "message": exc.message},
        ) from exc

    item = FoodcastPhotoItem(**serialize_foodcast_photo(photo))
    return FoodcastPhotoCreateResponse(photo=item)


@router.post("/photos/{photo_id}/report", response_model=FoodcastReportResult)
def report_foodcast_photo_endpoint(
    photo_id: UUID,
    payload: FoodcastReportCreate,
    db: Session = Depends(get_db),
):
    reporter = None
    if payload.reporter_email:
        reporter = db.scalar(select(User).where(User.email == payload.reporter_email.strip().lower()).limit(1))
    else:
        auth = get_request_auth()
        if auth is not None:
            reporter = db.get(User, auth.user_id)

    try:
        result = report_foodcast_photo(
            db,
            photo_id=photo_id,
            reason=payload.reason,
            note=payload.note,
            reporter=reporter,
            reporter_email=payload.reporter_email,
        )
    except FoodcastError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.message) from exc

    return FoodcastReportResult(**result)


@router.patch("/photos/{photo_id}/hide", response_model=FoodcastPhotoItem)
def hide_foodcast_photo_endpoint(
    photo_id: UUID,
    x_cron_secret: str | None = Header(default=None, alias="X-Cron-Secret"),
    db: Session = Depends(get_db),
):
    expected = settings.cron_secret
    if not expected or x_cron_secret != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    photo = hide_foodcast_photo_admin(db, photo_id=photo_id)
    return FoodcastPhotoItem(**serialize_foodcast_photo(photo))
