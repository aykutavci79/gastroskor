from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.integrations.google_places_live import GooglePlacesLiveClient
from app.models import Restaurant, RestaurantAnalyticsEvent, RestaurantCompetitor, RestaurantOwnership, Review, User
from app.schemas.panel import (
    AdminActivateSubscriptionRequest,
    AdminGrantPanelRequest,
    AdminVisitCompleteRequest,
    AiPurchaseRequest,
    AnalyticsEventCreate,
    ClaimOtpVerifyRequest,
    ClaimStartRequest,
    ClaimStartResponse,
    CompetitorAddRequest,
    PanelAccessRead,
    MenuItemCreateRequest,
    MenuItemUpdateRequest,
    PanelNotificationPreferencesRead,
    PanelNotificationPreferencesUpdate,
    PanelNotificationRead,
    PanelNotificationsResponse,
    RestaurantPromoSettingsUpdate,
    TaxDocumentRequest,
)
from app.schemas.restaurant_order import PanelOrderListResponse, RestaurantOrderDecision, RestaurantOrderRead
from app.services.panel_access import build_panel_access_state, get_user_ownership
from app.services.panel_dashboard import build_dashboard_payload
from app.services.competitor_ai_analysis import analyze_competitor_pair
from app.services.panel_ai_purchase import apply_ai_purchase
from app.services.panel_ai_quota import ai_quota_as_dict, build_ai_quota, record_ai_analysis
from app.services.panel_pricing import pricing_catalog_as_dict
from app.services.panel_admin import admin_grant_panel_access, assert_admin_grant_allowed, is_panel_admin_email
from app.services.menu_image_storage import save_menu_image
from app.services.card_emoji import CARD_EMOJI_PRESETS, normalize_card_emoji
from app.services.promo_social import normalize_instagram
from app.services.restaurant_menu import (
    create_menu_item,
    delete_menu_item,
    list_panel_menu,
    menu_item_to_dict,
    update_menu_item,
)
from app.services.restaurant_orders import (
    OrderError,
    decide_restaurant_order,
    list_panel_orders,
    order_to_dict,
    raise_order_http,
)
from app.services.restaurant_promo import ownership_promo_as_dict, subscription_allows_promo
from app.services.restaurant_claim import (
    admin_activate_subscription,
    admin_complete_visit,
    send_claim_otp,
    start_claim,
    submit_tax_document,
    verify_claim_otp,
)
from app.services.panel_notification_service import (
    get_or_create_preferences,
    list_notifications,
    mark_notification_clicked,
    mark_notification_opened,
    notification_to_dict,
    unread_count,
)
from app.services.panel_notification_jobs import run_scheduled_notification_jobs
from app.schemas.follower_promotion import (
    FollowerCouponRedeemRequest,
    FollowerCouponRedeemResponse,
    FollowerPromotionCreate,
    FollowerPromotionRead,
    FollowerCouponRead,
)
from app.schemas.user_notification import PanelFollowerListResponse
from app.services.follower_promotion_service import (
    coupon_to_dict,
    create_follower_promotion,
    list_promotions_for_ownership,
    promotion_to_dict,
    redeem_follower_coupon,
)
from app.services.restaurant_followers import list_panel_followers
from app.services.user_notification_service import notify_follower_coupon_issued

panel_router = APIRouter(prefix="/panel", tags=["panel"])
google_client = GooglePlacesLiveClient()


def resolve_user_by_email(db: Session, email: str) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found. Once Google ile giris yapin.")
    return user


def require_admin(secret: str | None) -> None:
    if settings.panel_admin_secret and secret == settings.panel_admin_secret:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin secret required")


def serialize_access(state) -> PanelAccessRead:
    return PanelAccessRead(
        has_ownership=state.has_ownership,
        can_access_panel=state.can_access_panel,
        panel_tier=state.panel_tier,
        verification_status=state.verification_status,
        subscription_status=state.subscription_status,
        trial_days_left=state.trial_days_left,
        competitor_limit=state.competitor_limit,
        can_write_actions=state.can_write_actions,
        pricing_next=state.pricing_next,
        ownership_id=state.ownership_id,
        restaurant_id=state.restaurant_id,
        restaurant_name=state.restaurant_name,
        google_place_id=state.google_place_id,
        pending_visit=state.pending_visit,
    )


@panel_router.get("/me", response_model=PanelAccessRead)
def panel_me(user_email: str = Query(...), db: Session = Depends(get_db)):
    user = resolve_user_by_email(db, user_email)
    ownership = get_user_ownership(db, user.id)
    state = build_panel_access_state(db, ownership)
    if ownership and state.can_access_panel:
        db.commit()
    return serialize_access(state)


@panel_router.get("/pricing")
def panel_pricing_catalog():
    return pricing_catalog_as_dict()


@panel_router.get("/admin/status")
def panel_admin_status(user_email: str = Query(...)):
    return {
        "is_panel_admin": is_panel_admin_email(user_email),
        "admin_emails_configured": bool((settings.panel_admin_emails or "").strip()),
        "panel_admin_secret_configured": bool((settings.panel_admin_secret or "").strip()),
        "hint": (
            "Railway API servisinde PANEL_ADMIN_EMAILS ve PANEL_ADMIN_SECRET tanimli olmali; "
            "degisiklikten sonra Redeploy."
        ),
    }


@panel_router.post("/admin/grant-access", response_model=PanelAccessRead)
async def admin_grant_access_endpoint(
    payload: AdminGrantPanelRequest,
    db: Session = Depends(get_db),
    x_panel_admin_secret: str | None = Header(default=None, alias="X-Panel-Admin-Secret"),
):
    assert_admin_grant_allowed(user_email=payload.user_email, secret_header=x_panel_admin_secret)

    user = resolve_user_by_email(db, payload.user_email)
    ownership = await admin_grant_panel_access(
        db,
        user=user,
        place_id=payload.place_id,
        city=payload.city,
        force_takeover=payload.force_takeover,
        admin_note=payload.admin_note,
    )
    state = build_panel_access_state(db, ownership)
    return serialize_access(state)


@panel_router.get("/dashboard")
def panel_dashboard(user_email: str = Query(...), db: Session = Depends(get_db)):
    user = resolve_user_by_email(db, user_email)
    ownership = get_user_ownership(db, user.id)
    state = build_panel_access_state(db, ownership)
    if not ownership or not state.can_access_panel:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Panel erisimi yok.")
    db.commit()
    return build_dashboard_payload(db, ownership, state)


@panel_router.get("/promo")
def get_panel_promo(user_email: str = Query(...), db: Session = Depends(get_db)):
    user = resolve_user_by_email(db, user_email)
    ownership = get_user_ownership(db, user.id)
    state = build_panel_access_state(db, ownership)
    if not ownership or not state.can_access_panel:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Panel erisimi yok.")
    return ownership_promo_as_dict(ownership)


@panel_router.get("/promo/emoji-presets")
def list_card_emoji_presets():
    return {"presets": CARD_EMOJI_PRESETS}


@panel_router.patch("/promo")
def update_panel_promo(payload: RestaurantPromoSettingsUpdate, db: Session = Depends(get_db)):
    user = resolve_user_by_email(db, payload.user_email)
    ownership = get_user_ownership(db, user.id)
    state = build_panel_access_state(db, ownership)
    if not ownership or not state.can_access_panel:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Panel erisimi yok.")

    if payload.card_emoji is not None:
        try:
            ownership.card_emoji = normalize_card_emoji(payload.card_emoji)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    if payload.card_cover_image_url is not None:
        ownership.promo_card_cover_image_url = payload.card_cover_image_url.strip() or None

    if not subscription_allows_promo(ownership.subscription):
        db.add(ownership)
        db.commit()
        db.refresh(ownership)
        return ownership_promo_as_dict(ownership)

    ownership.promo_has_own_courier = payload.has_own_courier
    if not payload.has_own_courier:
        ownership.online_orders_enabled = False
    elif payload.online_orders_enabled is not None:
        ownership.online_orders_enabled = payload.online_orders_enabled
    ownership.promo_direct_order_text = (payload.direct_order_text or "").strip() or None
    ownership.promo_direct_order_phone = (payload.direct_order_phone or "").strip() or None
    ownership.promo_direct_order_whatsapp = (payload.direct_order_whatsapp or "").strip() or None
    ownership.promo_direct_order_url = (payload.direct_order_url or "").strip() or None
    if payload.menu_image_url is not None:
        ownership.promo_menu_image_url = payload.menu_image_url.strip() or None
    if payload.instagram is not None:
        ownership.promo_instagram = normalize_instagram(payload.instagram)
    db.add(ownership)
    db.commit()
    db.refresh(ownership)
    return ownership_promo_as_dict(ownership)


@panel_router.post("/promo/menu-image")
async def upload_panel_menu_image(
    user_email: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    user = resolve_user_by_email(db, user_email)
    ownership = get_user_ownership(db, user.id)
    state = build_panel_access_state(db, ownership)
    if not ownership or not state.can_access_panel:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Panel erisimi yok.")
    if not subscription_allows_promo(ownership.subscription):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Aktif abonelik gerekli.")

    url = await save_menu_image(file)
    ownership.promo_menu_image_url = url
    db.add(ownership)
    db.commit()
    db.refresh(ownership)
    return {"menu_image_url": url, "settings": ownership_promo_as_dict(ownership)}


@panel_router.post("/promo/card-cover-image")
async def upload_panel_card_cover_image(
    user_email: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    user = resolve_user_by_email(db, user_email)
    ownership = get_user_ownership(db, user.id)
    state = build_panel_access_state(db, ownership)
    if not ownership or not state.can_access_panel:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Panel erisimi yok.")
    if not subscription_allows_promo(ownership.subscription):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Aktif abonelik gerekli.")

    url = await save_menu_image(file)
    ownership.promo_card_cover_image_url = url
    db.add(ownership)
    db.commit()
    db.refresh(ownership)
    return {"card_cover_image_url": url, "settings": ownership_promo_as_dict(ownership)}


@panel_router.get("/menu")
def get_panel_menu(user_email: str = Query(...), db: Session = Depends(get_db)):
    user = resolve_user_by_email(db, user_email)
    ownership = get_user_ownership(db, user.id)
    state = build_panel_access_state(db, ownership)
    if not ownership or not state.can_access_panel:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Panel erisimi yok.")
    return {
        "subscription_active": subscription_allows_promo(ownership.subscription),
        "items": list_panel_menu(db, ownership),
    }


@panel_router.post("/menu")
def add_panel_menu_item(payload: MenuItemCreateRequest, db: Session = Depends(get_db)):
    user = resolve_user_by_email(db, payload.user_email)
    ownership = get_user_ownership(db, user.id)
    state = build_panel_access_state(db, ownership)
    if not ownership or not state.can_access_panel:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Panel erisimi yok.")
    row = create_menu_item(
        db,
        ownership,
        name=payload.name,
        price_tl=payload.price_tl,
        description=payload.description,
        category=payload.category,
    )
    return menu_item_to_dict(row)


@panel_router.patch("/menu/{item_id}")
def update_panel_menu_item(
    item_id: UUID,
    payload: MenuItemUpdateRequest,
    db: Session = Depends(get_db),
):
    user = resolve_user_by_email(db, payload.user_email)
    ownership = get_user_ownership(db, user.id)
    state = build_panel_access_state(db, ownership)
    if not ownership or not state.can_access_panel:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Panel erisimi yok.")
    row = update_menu_item(
        db,
        ownership,
        item_id,
        name=payload.name,
        price_tl=payload.price_tl,
        description=payload.description,
        category=payload.category,
        is_active=payload.is_active,
        sort_order=payload.sort_order,
    )
    return menu_item_to_dict(row)


@panel_router.delete("/menu/{item_id}")
def remove_panel_menu_item(
    item_id: UUID,
    user_email: str = Query(...),
    db: Session = Depends(get_db),
):
    user = resolve_user_by_email(db, user_email)
    ownership = get_user_ownership(db, user.id)
    state = build_panel_access_state(db, ownership)
    if not ownership or not state.can_access_panel:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Panel erisimi yok.")
    delete_menu_item(db, ownership, item_id)
    return {"deleted": True}


@panel_router.get("/orders", response_model=PanelOrderListResponse)
def get_panel_orders(
    user_email: str = Query(...),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    user = resolve_user_by_email(db, user_email)
    ownership = get_user_ownership(db, user.id)
    state = build_panel_access_state(db, ownership)
    if not ownership or not state.can_access_panel:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Panel erisimi yok.")
    items = list_panel_orders(db, restaurant_id=ownership.restaurant_id, limit=limit)
    return PanelOrderListResponse(items=items)


@panel_router.patch("/orders/{order_id}", response_model=RestaurantOrderRead)
def patch_panel_order(
    order_id: UUID,
    payload: RestaurantOrderDecision,
    db: Session = Depends(get_db),
):
    user = resolve_user_by_email(db, payload.user_email)
    ownership = get_user_ownership(db, user.id)
    state = build_panel_access_state(db, ownership)
    if not ownership or not state.can_access_panel:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Panel erisimi yok.")
    try:
        order = decide_restaurant_order(
            db,
            ownership=ownership,
            order_id=order_id,
            decision=payload.decision,
        )
    except OrderError as exc:
        raise_order_http(exc)
    restaurant_name = order.restaurant.name if order.restaurant else None
    return order_to_dict(order, restaurant_name=restaurant_name)


@panel_router.post("/claim/start", response_model=ClaimStartResponse)
async def claim_start(payload: ClaimStartRequest, db: Session = Depends(get_db)):
    user = resolve_user_by_email(db, payload.user_email)
    ownership, phone_info = await start_claim(
        db, user=user, place_id=payload.place_id.strip(), city=payload.city
    )
    restaurant = ownership.restaurant
    return ClaimStartResponse(
        ownership_id=str(ownership.id),
        restaurant_id=str(ownership.restaurant_id),
        restaurant_name=restaurant.name if restaurant else "Restoran",
        verification_status=ownership.verification_status,
        panel_tier=ownership.panel_tier,
        phone_info=phone_info,
    )


@panel_router.post("/claim/send-otp")
async def claim_send_otp(user_email: str = Query(...), db: Session = Depends(get_db)):
    user = resolve_user_by_email(db, user_email)
    ownership = get_user_ownership(db, user.id)
    if not ownership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Once mekan secin.")
    result = await send_claim_otp(db, ownership=ownership)
    return result


@panel_router.post("/claim/verify-otp", response_model=PanelAccessRead)
def claim_verify_otp(payload: ClaimOtpVerifyRequest, db: Session = Depends(get_db)):
    user = resolve_user_by_email(db, payload.user_email)
    ownership = get_user_ownership(db, user.id)
    if not ownership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Once mekan secin.")
    verify_claim_otp(db, ownership=ownership, code=payload.code.strip())
    state = build_panel_access_state(db, ownership)
    return serialize_access(state)


@panel_router.post("/claim/tax-document", response_model=PanelAccessRead)
def claim_tax_document(payload: TaxDocumentRequest, db: Session = Depends(get_db)):
    user = resolve_user_by_email(db, payload.user_email)
    ownership = get_user_ownership(db, user.id)
    if not ownership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Once mekan secin.")
    submit_tax_document(db, ownership=ownership, note=payload.note)
    state = build_panel_access_state(db, ownership)
    return serialize_access(state)


@panel_router.get("/competitors")
def list_competitors(user_email: str = Query(...), db: Session = Depends(get_db)):
    user = resolve_user_by_email(db, user_email)
    ownership = get_user_ownership(db, user.id)
    state = build_panel_access_state(db, ownership)
    if not ownership or not state.can_access_panel:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Panel erisimi yok.")
    rows = db.scalars(
        select(RestaurantCompetitor)
        .where(RestaurantCompetitor.ownership_id == ownership.id)
        .order_by(RestaurantCompetitor.created_at.asc())
    ).all()
    return [
        {
            "id": str(row.id),
            "google_place_id": row.google_place_id,
            "name": row.competitor_name,
            "rating": row.last_rating,
            "review_count": row.last_review_count,
        }
        for row in rows
    ]


@panel_router.post("/competitors")
async def add_competitor(payload: CompetitorAddRequest, db: Session = Depends(get_db)):
    user = resolve_user_by_email(db, payload.user_email)
    ownership = get_user_ownership(db, user.id)
    state = build_panel_access_state(db, ownership)
    if not ownership or not state.can_access_panel:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Panel erisimi yok.")

    existing_count = len(ownership.competitors)
    if existing_count >= state.competitor_limit:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Rakip limiti doldu ({state.competitor_limit}).",
        )

    if payload.place_id == ownership.google_place_id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Kendi mekaninizi ekleyemezsiniz.")

    duplicate = db.scalar(
        select(RestaurantCompetitor).where(
            RestaurantCompetitor.ownership_id == ownership.id,
            RestaurantCompetitor.google_place_id == payload.place_id,
        )
    )
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bu rakip zaten listede.")

    details = await google_client.get_place_details(payload.place_id)
    row = RestaurantCompetitor(
        ownership_id=ownership.id,
        google_place_id=payload.place_id,
        competitor_name=payload.name.strip() or details.get("name") or "Rakip",
        last_rating=details.get("rating"),
        last_review_count=details.get("user_ratings_total"),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "id": str(row.id),
        "google_place_id": row.google_place_id,
        "name": row.competitor_name,
        "rating": row.last_rating,
        "review_count": row.last_review_count,
    }


@panel_router.post("/competitors/{competitor_id}/analyze")
async def analyze_competitor(
    competitor_id: UUID,
    user_email: str = Query(...),
    db: Session = Depends(get_db),
):
    user = resolve_user_by_email(db, user_email)
    ownership = get_user_ownership(db, user.id)
    state = build_panel_access_state(db, ownership)
    if not ownership or not state.can_access_panel:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Panel erisimi yok.")

    row = db.get(RestaurantCompetitor, competitor_id)
    if not row or row.ownership_id != ownership.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rakip bulunamadi.")

    quota = build_ai_quota(ownership)
    if not quota.can_run:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=quota.message,
            headers={
                "X-Next-Ai-Analysis-At": quota.next_analysis_at.isoformat() if quota.next_analysis_at else "",
            },
        )

    use_extra = quota.will_use_extra_credit

    own_name = ownership.restaurant.name if ownership.restaurant else "Sizin mekan"
    try:
        report = await analyze_competitor_pair(
            own_place_id=ownership.google_place_id,
            own_name=own_name,
            competitor_place_id=row.google_place_id,
            competitor_name=row.competitor_name,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    row.last_synced_at = datetime.now(timezone.utc)
    try:
        record_ai_analysis(ownership, use_extra_credit=use_extra)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    db.add(row)
    db.add(ownership)
    if ownership.subscription:
        db.add(ownership.subscription)
    db.commit()
    report["ai_quota"] = ai_quota_as_dict(build_ai_quota(ownership))
    report["used_extra_credit"] = use_extra
    return report


@panel_router.post("/ai-purchase")
def purchase_ai_addon(payload: AiPurchaseRequest, db: Session = Depends(get_db)):
    user = resolve_user_by_email(db, payload.user_email)
    ownership = get_user_ownership(db, user.id)
    state = build_panel_access_state(db, ownership)
    if not ownership or not state.can_access_panel:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Panel erisimi yok.")
    subscription = ownership.subscription
    if subscription is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Abonelik kaydi yok.")

    if not settings.panel_payments_mock:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Online odeme yakinda (iyzico). Simdilik destek@ ile iletisime gecin.",
        )

    result = apply_ai_purchase(subscription, payload.sku.strip())
    db.add(subscription)
    db.commit()
    return {
        "ok": True,
        "mock_payment": True,
        "purchase": result,
        "ai_quota": ai_quota_as_dict(build_ai_quota(ownership)),
        "ai_pricing": pricing_catalog_as_dict(),
    }


@panel_router.delete("/competitors/{competitor_id}")
def delete_competitor(competitor_id: UUID, user_email: str = Query(...), db: Session = Depends(get_db)):
    user = resolve_user_by_email(db, user_email)
    ownership = get_user_ownership(db, user.id)
    if not ownership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ownership not found")
    row = db.get(RestaurantCompetitor, competitor_id)
    if not row or row.ownership_id != ownership.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Competitor not found")
    db.delete(row)
    db.commit()
    return {"deleted": True}


@panel_router.post("/analytics/events", status_code=status.HTTP_201_CREATED)
def track_analytics_event(payload: AnalyticsEventCreate, db: Session = Depends(get_db)):
    restaurant_uuid = None
    if payload.restaurant_id:
        try:
            restaurant_uuid = UUID(payload.restaurant_id)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid restaurant_id") from exc

    row = RestaurantAnalyticsEvent(
        restaurant_id=restaurant_uuid,
        place_id=payload.place_id,
        event_type=payload.event_type,
        metadata_json=payload.metadata,
    )
    db.add(row)
    db.commit()
    return {"ok": True}


@panel_router.get("/notifications", response_model=PanelNotificationsResponse)
def panel_notifications(user_email: str = Query(...), limit: int = Query(default=30, ge=1, le=100), db: Session = Depends(get_db)):
    user = resolve_user_by_email(db, user_email)
    ownership = get_user_ownership(db, user.id)
    state = build_panel_access_state(db, ownership)
    if not ownership or not state.can_access_panel:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Panel erisimi yok.")
    rows = list_notifications(db, ownership_id=ownership.id, limit=limit)
    return PanelNotificationsResponse(
        items=[PanelNotificationRead(**notification_to_dict(row)) for row in rows],
        unread_count=unread_count(db, ownership_id=ownership.id),
    )


@panel_router.post("/notifications/{notification_id}/open")
def panel_notification_open(notification_id: UUID, user_email: str = Query(...), db: Session = Depends(get_db)):
    user = resolve_user_by_email(db, user_email)
    ownership = get_user_ownership(db, user.id)
    if not ownership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ownership not found")
    row = mark_notification_opened(db, notification_id=notification_id, ownership_id=ownership.id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return notification_to_dict(row)


@panel_router.post("/notifications/{notification_id}/click")
def panel_notification_click(notification_id: UUID, user_email: str = Query(...), db: Session = Depends(get_db)):
    user = resolve_user_by_email(db, user_email)
    ownership = get_user_ownership(db, user.id)
    if not ownership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ownership not found")
    row = mark_notification_clicked(db, notification_id=notification_id, ownership_id=ownership.id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return notification_to_dict(row)


@panel_router.get("/notification-preferences", response_model=PanelNotificationPreferencesRead)
def panel_notification_preferences_get(user_email: str = Query(...), db: Session = Depends(get_db)):
    user = resolve_user_by_email(db, user_email)
    ownership = get_user_ownership(db, user.id)
    state = build_panel_access_state(db, ownership)
    if not ownership or not state.can_access_panel:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Panel erisimi yok.")
    prefs = get_or_create_preferences(db, ownership.id)
    db.commit()
    return PanelNotificationPreferencesRead(
        email_enabled=prefs.email_enabled,
        in_app_enabled=prefs.in_app_enabled,
        analysis_reminders=prefs.analysis_reminders,
        trial_reminders=prefs.trial_reminders,
        negative_review_alerts=prefs.negative_review_alerts,
        competitor_alerts=prefs.competitor_alerts,
    )


@panel_router.patch("/notification-preferences", response_model=PanelNotificationPreferencesRead)
def panel_notification_preferences_update(payload: PanelNotificationPreferencesUpdate, db: Session = Depends(get_db)):
    user = resolve_user_by_email(db, payload.user_email)
    ownership = get_user_ownership(db, user.id)
    state = build_panel_access_state(db, ownership)
    if not ownership or not state.can_access_panel:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Panel erisimi yok.")
    prefs = get_or_create_preferences(db, ownership.id)
    for field in (
        "email_enabled",
        "in_app_enabled",
        "analysis_reminders",
        "trial_reminders",
        "negative_review_alerts",
        "competitor_alerts",
    ):
        value = getattr(payload, field)
        if value is not None:
            setattr(prefs, field, value)
    db.add(prefs)
    db.commit()
    db.refresh(prefs)
    return PanelNotificationPreferencesRead(
        email_enabled=prefs.email_enabled,
        in_app_enabled=prefs.in_app_enabled,
        analysis_reminders=prefs.analysis_reminders,
        trial_reminders=prefs.trial_reminders,
        negative_review_alerts=prefs.negative_review_alerts,
        competitor_alerts=prefs.competitor_alerts,
    )


@panel_router.post("/admin/ownerships/{ownership_id}/complete-visit", response_model=PanelAccessRead)
def admin_complete_visit_endpoint(
    ownership_id: UUID,
    payload: AdminVisitCompleteRequest,
    db: Session = Depends(get_db),
    x_panel_admin_secret: str | None = Header(default=None, alias="X-Panel-Admin-Secret"),
):
    require_admin(x_panel_admin_secret)
    ownership = db.get(RestaurantOwnership, ownership_id)
    if not ownership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ownership not found")
    admin_complete_visit(db, ownership=ownership, admin_note=payload.admin_note)
    state = build_panel_access_state(db, ownership)
    return serialize_access(state)


@panel_router.post("/admin/ownerships/{ownership_id}/activate-subscription", response_model=PanelAccessRead)
def admin_activate_subscription_endpoint(
    ownership_id: UUID,
    payload: AdminActivateSubscriptionRequest,
    db: Session = Depends(get_db),
    x_panel_admin_secret: str | None = Header(default=None, alias="X-Panel-Admin-Secret"),
):
    require_admin(x_panel_admin_secret)
    ownership = db.get(RestaurantOwnership, ownership_id)
    if not ownership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ownership not found")
    admin_activate_subscription(
        db,
        ownership=ownership,
        months=payload.months,
        use_intro_price=payload.use_intro_price,
        ai_analysis_interval_days=payload.ai_analysis_interval_days,
        ai_analysis_plan=payload.ai_analysis_plan,
    )
    state = build_panel_access_state(db, ownership)
    return serialize_access(state)


@panel_router.get("/admin/pending-visits")
def admin_pending_visits(
    db: Session = Depends(get_db),
    x_panel_admin_secret: str | None = Header(default=None, alias="X-Panel-Admin-Secret"),
):
    require_admin(x_panel_admin_secret)
    rows = db.scalars(
        select(RestaurantOwnership).where(RestaurantOwnership.verification_status == "pending_visit")
    ).all()
    return [
        {
            "ownership_id": str(row.id),
            "restaurant_id": str(row.restaurant_id),
            "google_place_id": row.google_place_id,
            "tax_document_note": row.tax_document_note,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]


@panel_router.get("/admin/reviews/search")
def admin_search_reviews(
    q: str = Query(..., min_length=2, max_length=120),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    x_panel_admin_secret: str | None = Header(default=None, alias="X-Panel-Admin-Secret"),
):
    require_admin(x_panel_admin_secret)
    needle = q.strip()
    rows = db.scalars(
        select(Review)
        .where(Review.review_text.ilike(f"%{needle}%"))
        .order_by(Review.created_at.desc())
        .limit(limit)
    ).all()
    results = []
    for row in rows:
        restaurant = db.get(Restaurant, row.restaurant_id)
        author = db.get(User, row.author_id) if row.author_id else None
        results.append(
            {
                "id": str(row.id),
                "restaurant_id": str(row.restaurant_id),
                "restaurant_name": restaurant.name if restaurant else None,
                "review_text": row.review_text,
                "rating": row.rating,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "author_email": author.email if author else None,
            }
        )
    return results


@panel_router.get("/followers", response_model=PanelFollowerListResponse)
def list_panel_restaurant_followers(
    user_email: str = Query(...),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    user = resolve_user_by_email(db, user_email)
    ownership = get_user_ownership(db, user.id)
    state = build_panel_access_state(db, ownership)
    if not ownership or not state.can_access_panel:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Panel erisimi yok.")
    data = list_panel_followers(db, restaurant_id=ownership.restaurant_id, limit=limit, offset=offset)
    return PanelFollowerListResponse(**data)


@panel_router.get("/follower-promotions", response_model=list[FollowerPromotionRead])
def list_panel_follower_promotions(user_email: str = Query(...), db: Session = Depends(get_db)):
    user = resolve_user_by_email(db, user_email)
    ownership = get_user_ownership(db, user.id)
    state = build_panel_access_state(db, ownership)
    if not ownership or not state.can_access_panel:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Panel erisimi yok.")
    return list_promotions_for_ownership(db, ownership.id)


@panel_router.post("/follower-promotions", response_model=FollowerPromotionRead, status_code=status.HTTP_201_CREATED)
def create_panel_follower_promotion(payload: FollowerPromotionCreate, db: Session = Depends(get_db)):
    user = resolve_user_by_email(db, payload.user_email)
    ownership = get_user_ownership(db, user.id)
    state = build_panel_access_state(db, ownership)
    if not ownership or not state.can_access_panel or not state.can_write_actions:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Kampanya icin tam panel yetkisi gerekir.")
    promo, new_coupons = create_follower_promotion(
        db,
        ownership=ownership,
        title=payload.title,
        discount_percent=payload.discount_percent,
        valid_days=payload.valid_days,
        max_coupons=payload.max_coupons,
    )
    restaurant = db.get(Restaurant, ownership.restaurant_id)
    if restaurant:
        for coupon in new_coupons:
            coupon_user = db.get(User, coupon.user_id)
            if coupon_user:
                notify_follower_coupon_issued(
                    db,
                    user=coupon_user,
                    restaurant=restaurant,
                    coupon=coupon,
                    promo_title=promo.title,
                )
        db.commit()
    return promotion_to_dict(db, promo)


@panel_router.post("/follower-coupons/redeem", response_model=FollowerCouponRedeemResponse)
def redeem_panel_follower_coupon(payload: FollowerCouponRedeemRequest, db: Session = Depends(get_db)):
    user = resolve_user_by_email(db, payload.user_email)
    ownership = get_user_ownership(db, user.id)
    state = build_panel_access_state(db, ownership)
    if not ownership or not state.can_access_panel or not state.can_write_actions:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Kupon onayi icin tam panel yetkisi gerekir.")
    coupon, message = redeem_follower_coupon(
        db,
        ownership=ownership,
        actor_user_id=user.id,
        code=payload.code,
    )
    restaurant = db.get(Restaurant, coupon.restaurant_id)
    return FollowerCouponRedeemResponse(
        ok=True,
        message=message,
        coupon=FollowerCouponRead(
            **coupon_to_dict(coupon, restaurant_name=restaurant.name if restaurant else None)
        ),
    )


@panel_router.delete("/admin/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_review(
    review_id: UUID,
    db: Session = Depends(get_db),
    x_panel_admin_secret: str | None = Header(default=None, alias="X-Panel-Admin-Secret"),
):
    require_admin(x_panel_admin_secret)
    review = db.get(Review, review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    db.delete(review)
    db.commit()
    return None
