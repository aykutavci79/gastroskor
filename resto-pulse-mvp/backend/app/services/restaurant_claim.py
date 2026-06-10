from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.integrations.google_places_live import GooglePlacesLiveClient
from app.models import PlatformName, Restaurant, RestaurantOwnership, RestaurantOtpChallenge, RestaurantPlatformProfile, User
from app.services.platform_profile_photo import photo_reference_from_place_details, sync_profile_photo_from_details
from app.services.panel_access import start_trial
from app.services.phone_tr import is_tr_mobile, normalize_tr_mobile
from app.services.sms_otp import generate_otp_code, hash_otp_code, send_sms_otp, verify_otp_code

google_client = GooglePlacesLiveClient()

CLAIM_ADMIN_APPROVAL_PHONE_INFO = {
    "requires_admin_approval": True,
    "is_mobile": False,
    "phone_masked": None,
    "requires_tax_document": False,
}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def apply_google_details_to_restaurant(
    restaurant: Restaurant,
    details: dict,
    *,
    city: str = "Bursa",
) -> None:
    name = details.get("name")
    if name:
        restaurant.name = name
    address = details.get("address")
    if address:
        restaurant.address = address
    if not restaurant.city:
        restaurant.city = city
    lat = details.get("latitude")
    lng = details.get("longitude")
    if lat is not None and lng is not None:
        restaurant.latitude = float(lat)
        restaurant.longitude = float(lng)


async def ensure_restaurant_coordinates(db: Session, restaurant: Restaurant) -> None:
    if restaurant.latitude is not None and restaurant.longitude is not None:
        return
    profile = db.scalar(
        select(RestaurantPlatformProfile).where(
            RestaurantPlatformProfile.restaurant_id == restaurant.id,
            RestaurantPlatformProfile.platform == PlatformName.google_maps,
        )
    )
    if not profile or not profile.external_id:
        return
    details = await google_client.get_place_details(profile.external_id)
    apply_google_details_to_restaurant(restaurant, details, city=restaurant.city or "Bursa")
    db.add(restaurant)
    db.commit()
    db.refresh(restaurant)


async def ensure_restaurant_for_place(db: Session, *, place_id: str, city: str = "Bursa") -> Restaurant:
    profile = db.scalar(
        select(RestaurantPlatformProfile).where(
            RestaurantPlatformProfile.platform == PlatformName.google_maps,
            RestaurantPlatformProfile.external_id == place_id,
        )
    )
    if profile:
        restaurant = db.get(Restaurant, profile.restaurant_id)
        if restaurant:
            if restaurant.latitude is None or restaurant.longitude is None or not profile.photo_reference:
                details = await google_client.get_place_details(place_id)
                if restaurant.latitude is None or restaurant.longitude is None:
                    apply_google_details_to_restaurant(restaurant, details, city=city)
                    db.add(restaurant)
                if not profile.photo_reference and sync_profile_photo_from_details(profile, details):
                    db.add(profile)
                db.flush()
            return restaurant

    details = await google_client.get_place_details(place_id)
    name = details.get("name") or "Isimsiz mekan"
    restaurant = Restaurant(
        name=name,
        city=city,
        address=details.get("address"),
        category="Restoran",
        is_active=True,
    )
    apply_google_details_to_restaurant(restaurant, details, city=city)
    db.add(restaurant)
    db.flush()

    db.add(
        RestaurantPlatformProfile(
            restaurant_id=restaurant.id,
            platform=PlatformName.google_maps,
            external_id=place_id,
            avg_rating=details.get("rating"),
            review_count=details.get("user_ratings_total"),
            photo_reference=photo_reference_from_place_details(details),
            last_synced_at=_utcnow(),
        )
    )
    db.flush()
    return restaurant


async def start_claim(
    db: Session,
    *,
    user: User,
    place_id: str,
    city: str = "Bursa",
) -> tuple[RestaurantOwnership, dict]:
    existing_place_owner = db.scalar(
        select(RestaurantOwnership).where(RestaurantOwnership.google_place_id == place_id)
    )
    if existing_place_owner and existing_place_owner.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu mekan baska bir kullaniciya bagli.",
        )

    existing_user_owner = db.scalar(select(RestaurantOwnership).where(RestaurantOwnership.user_id == user.id))
    if existing_user_owner and existing_user_owner.google_place_id != place_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Hesabinizda zaten baska bir mekan kaydi var.",
        )

    restaurant = await ensure_restaurant_for_place(db, place_id=place_id, city=city)

    ownership = existing_user_owner
    if ownership is None:
        ownership = RestaurantOwnership(
            user_id=user.id,
            restaurant_id=restaurant.id,
            google_place_id=place_id,
            verification_status="pending_admin" if settings.claim_admin_approval_only else "pending_sms",
            panel_tier="limited",
        )
        db.add(ownership)
        db.flush()
    else:
        ownership.restaurant_id = restaurant.id
        ownership.google_place_id = place_id

    if settings.claim_admin_approval_only:
        ownership.phone_e164 = None
        ownership.phone_last_four = None
        ownership.verification_method = "admin_approval"
        ownership.verification_status = "pending_admin"
        ownership.panel_tier = "limited"
        phone_info = dict(CLAIM_ADMIN_APPROVAL_PHONE_INFO)
    else:
        details = await google_client.get_place_details(place_id)
        phone_raw = details.get("phone_number")
        mobile = normalize_tr_mobile(phone_raw)
        phone_info = {
            "phone_raw": phone_raw,
            "is_mobile": mobile is not None,
            "phone_masked": f"*** *** ** {mobile[-2:]}" if mobile else None,
            "requires_tax_document": mobile is None,
            "requires_admin_approval": False,
        }
        if mobile:
            ownership.phone_e164 = mobile
            ownership.phone_last_four = mobile[-4:]
            ownership.verification_method = "sms"
            ownership.verification_status = "pending_sms"
        else:
            ownership.phone_e164 = None
            ownership.phone_last_four = None
            ownership.verification_method = "tax_document"
            ownership.verification_status = "pending_document"
            ownership.panel_tier = "limited"

    db.add(ownership)
    db.commit()
    db.refresh(ownership)
    return ownership, phone_info


async def send_claim_otp(db: Session, *, ownership: RestaurantOwnership) -> dict:
    if ownership.verification_method != "sms" or not ownership.phone_e164:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Bu kayit icin SMS dogrulama kullanilamaz. Vergi levhasi yolunu secin.",
        )

    code = generate_otp_code()
    challenge = RestaurantOtpChallenge(
        ownership_id=ownership.id,
        phone_e164=ownership.phone_e164,
        code_hash=hash_otp_code(code),
        expires_at=_utcnow() + timedelta(minutes=10),
    )
    db.add(challenge)
    db.commit()

    await send_sms_otp(phone_e164=ownership.phone_e164, code=code)
    return {
        "sent": True,
        "phone_masked": f"*** *** ** {ownership.phone_e164[-2:]}",
        "expires_in_minutes": 10,
    }


def verify_claim_otp(db: Session, *, ownership: RestaurantOwnership, code: str) -> RestaurantOwnership:
    challenge = db.scalar(
        select(RestaurantOtpChallenge)
        .where(
            RestaurantOtpChallenge.ownership_id == ownership.id,
            RestaurantOtpChallenge.consumed.is_(False),
        )
        .order_by(RestaurantOtpChallenge.created_at.desc())
        .limit(1)
    )
    if not challenge:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aktif OTP bulunamadi.")

    if challenge.expires_at <= _utcnow():
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="OTP suresi doldu.")

    if challenge.attempts >= 5:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Cok fazla deneme.")

    challenge.attempts += 1
    if not verify_otp_code(code, challenge.code_hash):
        db.add(challenge)
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gecersiz kod.")

    challenge.consumed = True
    ownership.verification_status = "verified_sms"
    ownership.panel_tier = "full"
    ownership.verification_method = "sms"
    ownership.verified_at = _utcnow()
    start_trial(db, ownership)
    db.add(challenge)
    db.add(ownership)
    db.commit()
    db.refresh(ownership)
    return ownership


def submit_tax_document(
    db: Session,
    *,
    ownership: RestaurantOwnership,
    note: str,
) -> RestaurantOwnership:
    if not note.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Vergi levhasi notu gerekli.")

    ownership.verification_method = "tax_document"
    ownership.verification_status = "pending_visit"
    ownership.panel_tier = "limited"
    ownership.tax_document_note = note.strip()
    start_trial(db, ownership)
    db.add(ownership)
    db.commit()
    db.refresh(ownership)
    return ownership


def admin_complete_visit(db: Session, *, ownership: RestaurantOwnership, admin_note: str | None = None) -> RestaurantOwnership:
    ownership.verification_status = "verified"
    ownership.panel_tier = "full"
    ownership.visit_completed_at = _utcnow()
    ownership.verified_at = ownership.verified_at or _utcnow()
    if admin_note:
        ownership.admin_notes = admin_note
    db.add(ownership)
    db.commit()
    db.refresh(ownership)
    return ownership


def admin_activate_subscription(
    db: Session,
    *,
    ownership: RestaurantOwnership,
    months: int = 1,
    use_intro_price: bool = True,
    ai_analysis_interval_days: int = 33,
    ai_analysis_plan: str = "standart",
) -> RestaurantOwnership:
    subscription = start_trial(db, ownership) if ownership.subscription is None else ownership.subscription
    now = _utcnow()
    subscription.status = "active"
    subscription.activated_at = now
    subscription.paid_until = now + timedelta(days=30 * months)
    if use_intro_price and not subscription.intro_price_used:
        subscription.intro_price_used = True
    subscription.ai_analysis_interval_days = max(1, ai_analysis_interval_days)
    subscription.ai_analysis_plan = ai_analysis_plan
    db.add(subscription)
    db.commit()
    db.refresh(ownership)
    return ownership
