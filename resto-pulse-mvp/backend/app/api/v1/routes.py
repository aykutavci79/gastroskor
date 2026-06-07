from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, UploadFile, status
from sqlalchemy import case, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.services.review_moderation import (
    ReviewModerationError,
    check_review_text,
    enforce_review_author_policy,
)
from app.db.session import get_db
from app.integrations.google_places_live import GooglePlacesLiveClient, build_place_photo_url
from app.integrations.google_places import build_google_review_link
from app.integrations.maps_links import (
    build_destination_label,
    build_google_maps_directions_url,
    build_google_maps_search_url,
)
from app.models import (
    CompensationCoupon,
    FeedbackMessage,
    PrivateFeedback,
    PlatformName,
    Restaurant,
    RestaurantOwnership,
    RestaurantPlatformProfile,
    Review,
    ReviewCategoryScore,
    ReviewHelpfulVote,
    ReviewImage,
    ReviewReply,
    SentimentLabel,
    User,
)
from app.schemas.check_in import CheckInPayload, CheckInResult, CheckInStatus
from app.schemas.regional_flavors import RegionalProductDetailResponse, RegionalProductListResponse
from app.schemas.feedback import (
    CompensationCouponCreate,
    CompensationCouponRead,
    CompensationIssueResponse,
    FeedbackMessageCreate,
    FeedbackMessageRead,
    PrivateFeedbackCreate,
    PrivateFeedbackDetailRead,
    PrivateFeedbackRead,
    PrivateFeedbackStatusUpdate,
)
from app.schemas.live_places import (
    LivePlaceDetails,
    LivePlaceSearchItem,
    LivePlaceSearchResponse,
    ParsedSearchIntent,
)
from app.services.query_parser import parse_search_query
from app.services.smart_filters import apply_smart_filters, merge_criteria
from app.schemas.restaurant import (
    CityTopResponse,
    NewMemberRestaurantsResponse,
    RestaurantCreate,
    RestaurantListItem,
    RestaurantRead,
    RestaurantTrendingItem,
)
from app.services.gastro_score_ranking import haversine_meters
from app.services.restaurant_check_in import (
    CheckInError,
    create_check_in,
    get_user_check_in_status,
    merge_check_in_counts_into_rows,
    visitor_count,
)
from app.services.restaurant_partner import (
    merge_partner_into_row,
    partner_listing_for_restaurant,
    partner_listings_by_google_place_ids,
    partner_listings_for_restaurant_ids,
)
from app.services.restaurant_menu import public_menu_for_ownership
from app.services.city_resolver import normalize_city_key, resolve_city_from_coords, resolve_city_name
from app.services.city_top_cache import read_city_top_cache
from app.services.city_top_google import fetch_city_top_google
from app.services.new_member_restaurants import list_new_member_restaurants
from app.services.regional_flavors import get_regional_product, list_regional_products
from app.services.panel_notification_jobs import notify_negative_gastro_review, run_scheduled_notification_jobs
from app.services.trending_google import get_trending_google_places
from app.services.trending_restaurants import get_trending_restaurants_week
from app.services.display_name import normalize_author_name_display, public_author_name
from app.services.restaurant_claim import ensure_restaurant_for_place
from app.services.platform_profile_photo import google_photo_url_for_profile, sync_profile_photo_from_details
from app.services.review_image_storage import MAX_REVIEW_IMAGES_PER_REVIEW, save_review_image
from app.services.user_avatar_storage import save_user_avatar
from app.services.gourmet_profile import (
    NicknameValidationError,
    check_nickname_available,
    normalize_nickname,
    public_user_avatar,
    validate_avatar_preset,
)
from app.schemas.review import (
    ReviewAnalyzeResponse,
    ReviewAuthorAction,
    ReviewCategoryRead,
    ReviewCreate,
    ReviewRead,
    ReviewReplyCreate,
    ReviewReplyRead,
    ReviewReplyUpdate,
    ReviewTextModerateRequest,
    ReviewTextModerateResponse,
    ReviewUpdate,
)
from app.schemas.follow import RestaurantFollowListResponse, RestaurantFollowStatus
from app.schemas.user import (
    AvatarPresetItem,
    GourmetProfileUpdate,
    NicknameCheckResponse,
    UserProfile,
    UserSyncPayload,
)
from app.schemas.user_notification import (
    PushTokenRegister,
    UserNotificationListResponse,
    UserNotificationRead,
)
from app.schemas.follower_promotion import FollowerCouponRead
from app.services.follow_notifications import notify_restaurant_new_follower
from app.services.follower_promotion_service import (
    get_user_coupon_at_restaurant,
    issue_coupon_for_follower,
    list_user_coupons,
)
from app.services.user_notification_service import (
    list_user_notifications,
    mark_notification_read,
    notify_follower_coupon_issued,
    notify_review_helpful,
    notify_review_reply,
    register_push_token,
)
from app.services.restaurant_follow import (
    follow_restaurant,
    follower_count,
    is_following,
    list_followed_restaurants,
    unfollow_restaurant,
)
from app.services.ai_analysis import AIAnalysisService
from app.services.gastro_score_ranking import haversine_meters
from app.services.live_place_search_service import search_live_places_optimized
from app.services.private_feedback_service import (
    create_feedback_message,
    create_private_feedback,
    get_private_feedback_detail,
    list_private_feedbacks_for_panel,
    list_private_feedbacks_for_user,
    resolve_user_uuid,
    update_private_feedback_status,
)
from app.services.compensation_service import issue_compensation_coupon
from app.api.v1.auth_routes import router as auth_router
from app.api.v1.metrics_routes import metrics_router
from app.api.v1.gourmet_chat_routes import router as gourmet_chat_router
from app.api.v1.panel_routes import panel_router
from app.api.v1.social_routes import router as social_router
from app.services.user_accounts import get_or_create_user, serialize_user
from app.services.app_metrics import record_app_usage_event

logger = logging.getLogger(__name__)

router = APIRouter()
ai_service = AIAnalysisService()
google_places_live_client = GooglePlacesLiveClient()


def _raise_review_moderation_error(exc: ReviewModerationError) -> None:
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail={
            "code": "profanity",
            "message": exc.message,
            "highlights": exc.highlights,
        },
    ) from exc


def parse_geo_indications(raw: list | None) -> list[GeoIndicationRead]:
    if not raw:
        return []
    items: list[GeoIndicationRead] = []
    for row in raw:
        if isinstance(row, dict) and row.get("product"):
            items.append(GeoIndicationRead.model_validate(row))
    return items


def get_google_place_id(db: Session, restaurant_id: UUID) -> str | None:
    stmt = select(RestaurantPlatformProfile.external_id).where(
        RestaurantPlatformProfile.restaurant_id == restaurant_id,
        RestaurantPlatformProfile.platform == PlatformName.google_maps,
    )
    return db.scalar(stmt)


def serialize_restaurant(restaurant: Restaurant, *, db: Session | None = None) -> RestaurantRead:
    place_id: str | None = None
    if db is not None:
        place_id = get_google_place_id(db, restaurant.id)

    destination_query = build_destination_label(
        name=restaurant.name,
        address=restaurant.address,
        city=restaurant.city,
    )
    maps_directions_url = build_google_maps_directions_url(
        place_id=place_id,
        latitude=restaurant.latitude,
        longitude=restaurant.longitude,
        query=destination_query or restaurant.name,
    )

    partner = partner_listing_for_restaurant(db, restaurant.id) if db is not None else {}
    menu: list[dict] = []
    if db is not None and partner.get("is_premium_partner"):
        ownership_row = db.scalar(
            select(RestaurantOwnership)
            .where(RestaurantOwnership.restaurant_id == restaurant.id)
            .options(selectinload(RestaurantOwnership.subscription), selectinload(RestaurantOwnership.menu_items))
            .limit(1)
        )
        if ownership_row:
            menu = public_menu_for_ownership(ownership_row, preview=False)

    return RestaurantRead(
        id=str(restaurant.id),
        name=restaurant.name,
        city=restaurant.city,
        district=restaurant.district,
        address=restaurant.address,
        latitude=restaurant.latitude,
        longitude=restaurant.longitude,
        category=restaurant.category,
        geo_indications=parse_geo_indications(restaurant.geo_indications),
        has_geographical_indication=restaurant.has_geographical_indication,
        gi_product_name=restaurant.gi_product_name,
        google_place_id=place_id,
        maps_directions_url=maps_directions_url,
        maps_search_url=maps_directions_url,
        promo=partner.get("promo"),
        is_premium_partner=bool(partner.get("is_premium_partner")),
        menu=menu,
        menu_preview=partner.get("menu_preview") or [],
        menu_item_count=int(partner.get("menu_item_count") or 0),
        check_in_visitor_count=visitor_count(db, restaurant_id=restaurant.id) if db is not None else 0,
    )


def review_image_urls(review: Review) -> list[str]:
    images = getattr(review, "images", None) or []
    return [row.image_url for row in sorted(images, key=lambda item: item.sort_order)]


def resolve_actor_user(
    db: Session,
    *,
    author_id: str | None,
    author_email: str | None,
) -> User:
    user_uuid = resolve_user_uuid(db, user_id=author_id, email=author_email)
    if not user_uuid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="author_id veya author_email gerekli ve kayitli olmali.",
        )
    user = db.get(User, user_uuid)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kullanici bulunamadi.")
    return user


def assert_review_owner(user: User, review: Review) -> None:
    if not review.author_id or review.author_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu islem icin yorum sahibi olmalisiniz.",
        )


def assert_gs_review_editable(review: Review) -> None:
    if review.source_platform is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Harici kaynak yorumlari duzenlenemez.",
        )


def load_review_or_404(db: Session, review_id: UUID) -> Review:
    review = db.scalar(
        select(Review)
        .where(Review.id == review_id)
        .options(
            selectinload(Review.category_scores),
            selectinload(Review.author),
            selectinload(Review.images),
            selectinload(Review.helpful_votes),
            selectinload(Review.replies).selectinload(ReviewReply.author),
        )
    )
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    return review


def serialize_review_reply(reply: ReviewReply) -> ReviewReplyRead:
    avatar_url, avatar_preset = public_user_avatar(reply.author)
    author_name = None
    if reply.author:
        author_name = public_author_name(
            reply.author.full_name,
            reply.author.default_review_name_display,
            nickname=reply.author.nickname,
        )
    return ReviewReplyRead(
        id=str(reply.id),
        review_id=str(reply.review_id),
        author_id=str(reply.author_id) if reply.author_id else None,
        author_email=reply.author.email if reply.author else None,
        author_name=author_name,
        author_avatar_url=avatar_url,
        author_avatar_preset=avatar_preset,
        reply_text=reply.reply_text,
        created_at=reply.created_at.isoformat() if reply.created_at else None,
        updated_at=reply.updated_at.isoformat() if reply.updated_at else None,
    )


def serialize_review(review: Review, *, viewer_user_id: UUID | None = None) -> ReviewRead:
    raw_name = review.author.full_name if review.author else None
    author_nickname = review.author.nickname if review.author else None
    display_mode = normalize_author_name_display(getattr(review, "author_name_display", None))
    author_name = public_author_name(raw_name, display_mode, nickname=author_nickname)
    author_avatar, author_avatar_preset = public_user_avatar(review.author)
    helpful_votes = getattr(review, "helpful_votes", None) or []
    helpful_count = len(helpful_votes)
    viewer_marked_helpful = False
    if viewer_user_id:
        viewer_marked_helpful = any(vote.user_id == viewer_user_id for vote in helpful_votes)
    viewer_can_edit = bool(
        viewer_user_id
        and review.author_id
        and review.author_id == viewer_user_id
        and review.source_platform is None
    )
    replies = getattr(review, "replies", None) or []
    return ReviewRead(
        id=str(review.id),
        restaurant_id=str(review.restaurant_id),
        author_id=str(review.author_id) if review.author_id else None,
        author_email=review.author.email if review.author else None,
        author_name=author_name,
        author_avatar_url=author_avatar,
        author_avatar_preset=author_avatar_preset,
        author_name_display=display_mode,
        rating=review.rating,
        review_text=review.review_text,
        image_urls=review_image_urls(review),
        created_at=review.created_at.isoformat() if review.created_at else None,
        updated_at=review.updated_at.isoformat() if review.updated_at else None,
        sentiment_label=review.sentiment_label.value if review.sentiment_label else None,
        sentiment_score=review.sentiment_score,
        ai_summary=review.ai_summary,
        is_demo=review.is_demo,
        source_platform=review.source_platform.value if review.source_platform else None,
        categories=[
            ReviewCategoryRead(
                category=row.category,
                score=row.score,
                label=row.label.value if row.label else None,
                reason=row.reason,
            )
            for row in review.category_scores
        ],
        helpful_count=helpful_count,
        viewer_marked_helpful=viewer_marked_helpful,
        viewer_can_edit=viewer_can_edit,
        replies=[serialize_review_reply(row) for row in replies],
    )


def serialize_private_feedback(feedback: PrivateFeedback) -> PrivateFeedbackRead:
    return PrivateFeedbackRead(
        id=str(feedback.id),
        place_id=feedback.place_id,
        restaurant_id=str(feedback.restaurant_id) if feedback.restaurant_id else None,
        author_id=str(feedback.author_id),
        category=feedback.category,
        severity=feedback.severity,  # type: ignore[arg-type]
        visit_at=feedback.visit_at,
        message=feedback.message,
        status=feedback.status,  # type: ignore[arg-type]
        created_at=feedback.created_at,
        updated_at=feedback.updated_at,
    )


def serialize_feedback_message(row: FeedbackMessage) -> FeedbackMessageRead:
    return FeedbackMessageRead(
        id=str(row.id),
        feedback_id=str(row.feedback_id),
        sender_type=row.sender_type,  # type: ignore[arg-type]
        message=row.message,
        attachments_json=row.attachments_json,
        created_at=row.created_at,
    )


def serialize_compensation_coupon(row: CompensationCoupon) -> CompensationCouponRead:
    return CompensationCouponRead(
        id=str(row.id),
        feedback_id=str(row.feedback_id),
        restaurant_id=str(row.restaurant_id),
        user_id=str(row.user_id),
        discount_percent=row.discount_percent,
        code=row.code,
        expires_at=row.expires_at,
        status=row.status,
        created_at=row.created_at,
    )


@router.get("/health")
def health():
    return {"status": "ok", "service": settings.app_name}


@router.post("/dev/seed-panel-demo")
def seed_panel_demo(db: Session = Depends(get_db)):
    """Panel UI testi icin ornek sikayet kayitlari olusturur."""
    actor = get_or_create_user(
        db,
        email="restaurant-actor@example.com",
        full_name="Panel Demo Actor",
        avatar_url=None,
        google_sub=None,
    )

    restaurant = db.scalar(select(Restaurant).where(Restaurant.is_active.is_(True)).order_by(Restaurant.name.asc()).limit(1))
    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aktif restoran bulunamadi")

    existing_open = db.scalar(
        select(func.count(PrivateFeedback.id)).where(
            PrivateFeedback.restaurant_id == restaurant.id,
            PrivateFeedback.status == "open",
        )
    ) or 0

    samples = [
        ("seed-panel-001", "Servis", "medium", "Garson siparisi gec getirdi, masa ilgilenmedi."),
        ("seed-panel-002", "Hijyen", "high", "Masada onceki musteriden kalan kirintilar vardi."),
        ("seed-panel-003", "Lezzet", "medium", "Yemek soguk geldi, porsiyon kucuktu."),
        ("seed-panel-004", "Fiyat", "low", "Menudeki fiyat ile kasadaki fiyat farkli cikti."),
    ]

    created = 0
    if existing_open < 4:
        for place_id, category, severity, message in samples:
            already = db.scalar(
                select(PrivateFeedback.id).where(
                    PrivateFeedback.restaurant_id == restaurant.id,
                    PrivateFeedback.place_id == place_id,
                )
            )
            if already:
                continue
            db.add(
                PrivateFeedback(
                    place_id=place_id,
                    restaurant_id=restaurant.id,
                    author_id=actor.id,
                    category=category,
                    severity=severity,
                    message=message,
                    status="open",
                )
            )
            created += 1
        db.commit()

    open_count = db.scalar(
        select(func.count(PrivateFeedback.id)).where(
            PrivateFeedback.restaurant_id == restaurant.id,
            PrivateFeedback.status == "open",
        )
    ) or 0

    return {
        "restaurant_id": str(restaurant.id),
        "restaurant_name": restaurant.name,
        "actor_email": actor.email,
        "created": created,
        "open_count": int(open_count),
    }


@router.get("/live/places/search", response_model=LivePlaceSearchResponse)
async def search_live_places(
    q: str = Query(min_length=2, description="Canli arama (dogal dil destekli)"),
    city: str = Query(default="Bursa", description="Il varsayilan: Bursa"),
    limit: int = Query(default=8, ge=1, le=20),
    origin_lat: float | None = Query(default=None, description="Kullanici enlemi (mesafe puani icin)"),
    origin_lng: float | None = Query(default=None, description="Kullanici boylami (mesafe puani icin)"),
    distance_band: str | None = Query(
        default=None,
        description="0-250 | 251-500 | 501-1000 | 1100-2000 | 2100+",
    ),
    rating_band: str | None = Query(
        default=None,
        description="3.0-3.9 | 4.0-4.4 | 4.5-5.0",
    ),
    db: Session = Depends(get_db),
):
    if not settings.google_places_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GOOGLE_PLACES_API_KEY tanimli degil.",
        )

    parsed = parse_search_query(q)
    criteria = merge_criteria(parsed, distance_band=distance_band, rating_band=rating_band)

    try:
        result = await search_live_places_optimized(
            db,
            q=q,
            city=city,
            limit=limit,
            origin_lat=origin_lat,
            origin_lng=origin_lng,
            criteria=criteria,
            parsed=parsed,
            distance_band=distance_band,
            rating_band=rating_band,
        )
        try:
            record_app_usage_event(db, event_type="live_search", platform="api")
        except Exception:
            logger.exception("live_search metrics kaydi atlandi")
        return result
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Google Places baglantisi basarisiz: {exc}",
        ) from exc


@router.get("/live/places/details/{place_id}", response_model=LivePlaceDetails)
async def get_live_place_details(
    place_id: str,
    city: str = Query(default="Bursa", description="Il varsayilan: Bursa"),
    sort: str = Query(default="newest", description="Yorum siralama: newest, oldest, highest_rating, lowest_rating"),
    review_filter: str = Query(
        default="all",
        alias="filter",
        description="Yorum filtresi: all, negative",
    ),
    db: Session = Depends(get_db),
):
    if not settings.google_places_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GOOGLE_PLACES_API_KEY tanimli degil.",
        )

    try:
        details = await google_places_live_client.get_place_details(place_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Google Places baglantisi basarisiz: {exc}",
        ) from exc

    all_reviews = [review for review in details.get("reviews", []) if review.get("text")]
    
    # Apply filter
    if review_filter == "negative":
        filtered_reviews = [r for r in all_reviews if r.get("rating") and r.get("rating") < 3]
    else:
        filtered_reviews = all_reviews
    
    # Apply sort (Google returns newest first by default)
    if sort == "oldest":
        filtered_reviews = list(reversed(filtered_reviews))
    elif sort == "highest_rating":
        filtered_reviews.sort(key=lambda r: r.get("rating") or 0, reverse=True)
    elif sort == "lowest_rating":
        filtered_reviews.sort(key=lambda r: r.get("rating") or 0)
    # else: newest (default) - keep Google's order

    profile_stmt = select(RestaurantPlatformProfile).where(
        RestaurantPlatformProfile.external_id == place_id,
        RestaurantPlatformProfile.platform == PlatformName.google_maps,
    )
    mapping = db.scalar(profile_stmt)
    if not mapping:
        restaurant = await ensure_restaurant_for_place(db, place_id=place_id, city=city)
        db.commit()
        db.refresh(restaurant)
        mapping = db.scalar(profile_stmt)

    member_reviews: list[dict] = []
    member_review_count = 0
    member_avg_rating = None
    restaurant_id = None

    if mapping:
        if sync_profile_photo_from_details(mapping, details):
            db.add(mapping)
            db.commit()
        restaurant_id = str(mapping.restaurant_id)
        review_rows = (
            db.scalars(
                select(Review)
                .where(Review.restaurant_id == mapping.restaurant_id, Review.source_platform.is_(None))
                .options(
                    selectinload(Review.category_scores),
                    selectinload(Review.author),
                    selectinload(Review.images),
                )
                .order_by(Review.created_at.desc())
            )
            .all()
        )
        member_review_count = len(review_rows)
        member_avg_rating = db.scalar(
            select(func.avg(Review.rating)).where(Review.restaurant_id == mapping.restaurant_id, Review.source_platform.is_(None))
        )
        member_reviews = []
        for review in review_rows:
            avatar_url, avatar_preset = public_user_avatar(review.author)
            member_reviews.append(
                {
                    "id": str(review.id),
                    "author_name": public_author_name(
                        review.author.full_name if review.author else None,
                        getattr(review, "author_name_display", None),
                        nickname=review.author.nickname if review.author else None,
                    ),
                    "author_avatar_url": avatar_url,
                    "author_avatar_preset": avatar_preset,
                    "rating": review.rating,
                    "review_text": review.review_text,
                    "created_at": review.created_at.isoformat() if review.created_at else None,
                    "image_urls": review_image_urls(review),
                    "sentiment_label": review.sentiment_label.value if review.sentiment_label else None,
                    "sentiment_score": review.sentiment_score,
                }
            )

    combined_texts = [review["text"] for review in filtered_reviews if review.get("text")]
    combined_texts.extend([review["review_text"] for review in member_reviews if review.get("review_text")])
    review_ratings = [review["rating"] for review in filtered_reviews if review.get("rating") is not None]
    review_ratings.extend(
        review["rating"] for review in member_reviews if review.get("rating") is not None
    )
    analysis = await ai_service.analyze_place_reviews(
        combined_texts,
        google_rating=details.get("rating"),
        review_ratings=review_ratings,
    )

    return LivePlaceDetails(
        place_id=details["place_id"],
        restaurant_id=restaurant_id,
        name=details["name"],
        address=details.get("address"),
        rating=details.get("rating"),
        user_ratings_total=details.get("user_ratings_total"),
        phone_number=details.get("phone_number"),
        website=details.get("website"),
        opening_hours=details.get("opening_hours"),
        reviews=filtered_reviews,
        member_reviews=member_reviews,
        member_review_count=member_review_count,
        member_avg_rating=round(float(member_avg_rating), 1) if member_avg_rating is not None else None,
        maps_directions_url=build_google_maps_directions_url(
            place_id=details["place_id"],
            latitude=None,
            longitude=None,
            query=build_destination_label(name=details["name"], address=details.get("address"), city=city) or details["name"],
        ),
        maps_search_url=build_google_maps_search_url(
            place_id=details["place_id"],
            query=build_destination_label(name=details["name"], address=details.get("address"), city=city) or details["name"],
        ),
        photo_urls=details.get("photo_urls") or [],
        analysis=analysis,
    )


@router.get("/restaurants/trending-week", response_model=list[RestaurantTrendingItem])
async def trending_restaurants_week(
    lat: float | None = Query(default=None, ge=-90, le=90),
    lng: float | None = Query(default=None, ge=-180, le=180),
    city: str = Query(default="Bursa"),
    limit: int = Query(default=6, ge=1, le=12),
    days: int = Query(default=7, ge=1, le=30),
    source: str = Query(
        default="google",
        description="google | gastroskor — baslangicta google onerilir",
    ),
    db: Session = Depends(get_db),
):
    if source == "google":
        if not settings.google_places_api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="GOOGLE_PLACES_API_KEY tanimli degil.",
            )
        try:
            items = await get_trending_google_places(
                limit=limit,
                origin_lat=lat,
                origin_lng=lng,
                city=city,
            )
            place_ids = [row.get("google_place_id") for row in items if row.get("google_place_id")]
            partner_by_place = partner_listings_by_google_place_ids(db, place_ids)
            for row in items:
                pid = row.get("google_place_id")
                if pid and pid in partner_by_place:
                    merge_partner_into_row(row, partner_by_place[pid])
            return items
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Google Places baglantisi basarisiz: {exc}",
            ) from exc

    return get_trending_restaurants_week(
        db,
        limit=limit,
        days=days,
        origin_lat=lat,
        origin_lng=lng,
        city=city,
    )


@router.get("/restaurants/city-top", response_model=CityTopResponse)
async def city_top_restaurants(
    lat: float | None = Query(default=None, ge=-90, le=90),
    lng: float | None = Query(default=None, ge=-180, le=180),
    city: str | None = Query(default=None),
    limit: int = Query(default=5, ge=1, le=10),
    db: Session = Depends(get_db),
):
    city_label = resolve_city_name(city) if city else resolve_city_from_coords(lat, lng)
    city_key = normalize_city_key(city_label)
    was_cached = read_city_top_cache(city_key) is not None

    if not settings.google_places_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GOOGLE_PLACES_API_KEY tanimli degil.",
        )
    try:
        items = await fetch_city_top_google(city_label, limit=limit)
        place_ids = [row.get("google_place_id") for row in items if row.get("google_place_id")]
        partner_by_place = partner_listings_by_google_place_ids(db, place_ids)
        for row in items:
            pid = row.get("google_place_id")
            if pid and pid in partner_by_place:
                merge_partner_into_row(row, partner_by_place[pid])
            plat = row.get("latitude")
            plng = row.get("longitude")
            if lat is not None and lng is not None and plat is not None and plng is not None:
                dist = haversine_meters(lat, lng, float(plat), float(plng))
                row["distance_meters"] = dist
                row["distance_km"] = round(dist / 1000, 1)
                row["distance_origin"] = "user"
        return CityTopResponse(city=city_label, items=items, cached=was_cached)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Google Places baglantisi basarisiz: {exc}",
        ) from exc


@router.get("/restaurants/new-members", response_model=NewMemberRestaurantsResponse)
def new_member_restaurants(
    limit: int = Query(default=12, ge=1, le=24),
    db: Session = Depends(get_db),
):
    items = list_new_member_restaurants(db, limit=limit)
    return NewMemberRestaurantsResponse(items=items)


@router.get("/regional-flavors/products", response_model=RegionalProductListResponse)
def regional_flavor_products(
    city: str = Query(default="Bursa", min_length=2, max_length=120),
):
    return list_regional_products(city=city)


@router.get("/regional-flavors/products/{slug}", response_model=RegionalProductDetailResponse)
def regional_flavor_product_detail(
    slug: str,
    city: str = Query(default="Bursa", min_length=2, max_length=120),
):
    payload = get_regional_product(slug=slug, city=city)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Urun bulunamadi")
    return payload


@router.get("/restaurants", response_model=list[RestaurantListItem])
def list_restaurants(
    q: str | None = Query(default=None, description="Isim/konum aramasi"),
    city: str | None = Query(default=None),
    origin_lat: float | None = Query(default=None, ge=-90, le=90),
    origin_lng: float | None = Query(default=None, ge=-180, le=180),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    stmt = select(Restaurant).where(Restaurant.is_active.is_(True))
    if q:
        stmt = stmt.where(Restaurant.name.ilike(f"%{q}%"))
    if city:
        stmt = stmt.where(Restaurant.city.ilike(f"%{city}%"))
    # Arama yokken: canli aramayla otomatik eklenen "hayalet" kayitlari listeleme.
    # Sadece uye isletme veya en az bir GS yorumu olan mekanlar (seed dahil).
    if not q:
        has_ownership = (
            select(RestaurantOwnership.id)
            .where(RestaurantOwnership.restaurant_id == Restaurant.id)
            .exists()
        )
        has_gs_review = (
            select(Review.id)
            .where(Review.restaurant_id == Restaurant.id, Review.source_platform.is_(None))
            .exists()
        )
        stmt = stmt.where(has_ownership | has_gs_review)
    rows = db.scalars(stmt.order_by(Restaurant.name.asc()).limit(limit)).all()
    restaurant_ids = [r.id for r in rows]
    partner_map = partner_listings_for_restaurant_ids(db, restaurant_ids)

    google_profiles: dict[str, RestaurantPlatformProfile] = {}
    google_place_ids: dict[str, str] = {}
    if restaurant_ids:
        for profile in db.scalars(
            select(RestaurantPlatformProfile).where(
                RestaurantPlatformProfile.restaurant_id.in_(restaurant_ids),
                RestaurantPlatformProfile.platform == PlatformName.google_maps,
            )
        ).all():
            rid = str(profile.restaurant_id)
            google_profiles[rid] = profile
            if profile.external_id:
                google_place_ids[rid] = profile.external_id

    has_origin = origin_lat is not None and origin_lng is not None

    result: list[dict] = []
    for restaurant in rows:
        avg_rating = db.scalar(
            select(func.avg(Review.rating)).where(Review.restaurant_id == restaurant.id)
        )
        rid = str(restaurant.id)
        google_profile = google_profiles.get(rid)
        place_id = google_place_ids.get(rid)
        destination_query = build_destination_label(
            name=restaurant.name,
            address=restaurant.address,
            city=restaurant.city,
        )
        maps_url = build_google_maps_directions_url(
            place_id=place_id,
            latitude=restaurant.latitude,
            longitude=restaurant.longitude,
            query=destination_query or restaurant.name,
        )
        distance_m: float | None = None
        if (
            has_origin
            and restaurant.latitude is not None
            and restaurant.longitude is not None
        ):
            distance_m = haversine_meters(
                origin_lat,
                origin_lng,
                restaurant.latitude,
                restaurant.longitude,
            )
        row = {
            "id": rid,
            "name": restaurant.name,
            "city": restaurant.city,
            "district": restaurant.district,
            "category": restaurant.category,
            "avg_rating": round(float(avg_rating), 1) if avg_rating is not None else None,
            "google_rating": round(float(google_profile.avg_rating), 1)
            if google_profile and google_profile.avg_rating is not None
            else None,
            "google_review_count": google_profile.review_count if google_profile else None,
            "latitude": restaurant.latitude,
            "longitude": restaurant.longitude,
            "maps_directions_url": maps_url,
            "distance_meters": round(distance_m) if distance_m is not None else None,
            "geo_indications": parse_geo_indications(restaurant.geo_indications),
            "has_geographical_indication": restaurant.has_geographical_indication,
            "gi_product_name": restaurant.gi_product_name,
            "google_photo_url": google_photo_url_for_profile(google_profile),
        }
        merge_partner_into_row(row, partner_map.get(rid))
        result.append(row)
    merge_check_in_counts_into_rows(db, result)
    return result


@router.get("/me/restaurant-follows", response_model=RestaurantFollowListResponse)
def list_my_restaurant_follows(
    user_email: str = Query(..., min_length=3),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    user = get_or_create_user(db, email=user_email)
    items = list_followed_restaurants(db, user_id=user.id, limit=limit)
    return RestaurantFollowListResponse(items=items, total=len(items))


@router.post("/me/push-token")
def register_my_push_token(payload: PushTokenRegister, db: Session = Depends(get_db)):
    user = get_or_create_user(db, email=payload.user_email)
    register_push_token(
        db,
        user_id=user.id,
        expo_push_token=payload.expo_push_token,
        platform=payload.platform,
    )
    return {"ok": True}


@router.get("/me/notifications", response_model=UserNotificationListResponse)
def list_my_notifications(
    user_email: str = Query(..., min_length=3),
    limit: int = Query(default=40, ge=1, le=100),
    db: Session = Depends(get_db),
):
    user = get_or_create_user(db, email=user_email)
    return list_user_notifications(db, user_id=user.id, limit=limit)


@router.post("/me/notifications/{notification_id}/read")
def read_my_notification(
    notification_id: UUID,
    user_email: str = Query(..., min_length=3),
    db: Session = Depends(get_db),
):
    user = get_or_create_user(db, email=user_email)
    ok = mark_notification_read(db, user_id=user.id, notification_id=notification_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bildirim bulunamadi.")
    return {"ok": True}


@router.get("/me/follower-coupons", response_model=list[FollowerCouponRead])
def list_my_follower_coupons(
    user_email: str = Query(..., min_length=3),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    user = get_or_create_user(db, email=user_email)
    rows = list_user_coupons(db, user_id=user.id, limit=limit)
    return [FollowerCouponRead(**row) for row in rows]


@router.get("/restaurants/{restaurant_id}/follower-coupon", response_model=FollowerCouponRead | None)
def restaurant_follower_coupon(
    restaurant_id: UUID,
    user_email: str = Query(..., min_length=3),
    db: Session = Depends(get_db),
):
    user = db.scalar(select(User).where(User.email == user_email.strip().lower()))
    if not user:
        return None
    row = get_user_coupon_at_restaurant(db, user_id=user.id, restaurant_id=restaurant_id)
    return row


@router.get("/restaurants/{restaurant_id}/follow-status", response_model=RestaurantFollowStatus)
def restaurant_follow_status(
    restaurant_id: UUID,
    user_email: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    _require_restaurant_exists(db, restaurant_id)
    following = False
    if user_email and user_email.strip():
        user = db.scalar(select(User).where(User.email == user_email.strip().lower()))
        if user:
            following = is_following(db, user_id=user.id, restaurant_id=restaurant_id)
    return RestaurantFollowStatus(
        following=following,
        follower_count=follower_count(db, restaurant_id=restaurant_id),
    )


@router.post("/restaurants/{restaurant_id}/follow", response_model=RestaurantFollowStatus)
async def follow_restaurant_endpoint(
    restaurant_id: UUID,
    user_email: str = Query(..., min_length=3),
    db: Session = Depends(get_db),
):
    user = get_or_create_user(db, email=user_email)
    created = follow_restaurant(db, user_id=user.id, restaurant_id=restaurant_id)
    if created:
        coupon = issue_coupon_for_follower(db, restaurant_id=restaurant_id, user_id=user.id)
        db.commit()
        await notify_restaurant_new_follower(db, restaurant_id=restaurant_id, follower=user)
        if coupon:
            restaurant = db.get(Restaurant, restaurant_id)
            if restaurant:
                notify_follower_coupon_issued(db, user=user, restaurant=restaurant, coupon=coupon)
                db.commit()
    return RestaurantFollowStatus(
        following=True,
        follower_count=follower_count(db, restaurant_id=restaurant_id),
    )


@router.delete("/restaurants/{restaurant_id}/follow", response_model=RestaurantFollowStatus)
def unfollow_restaurant_endpoint(
    restaurant_id: UUID,
    user_email: str = Query(..., min_length=3),
    db: Session = Depends(get_db),
):
    user = get_or_create_user(db, email=user_email)
    unfollow_restaurant(db, user_id=user.id, restaurant_id=restaurant_id)
    return RestaurantFollowStatus(
        following=False,
        follower_count=follower_count(db, restaurant_id=restaurant_id),
    )


def _require_restaurant_exists(db: Session, restaurant_id: UUID) -> Restaurant:
    restaurant = db.get(Restaurant, restaurant_id)
    if not restaurant or not restaurant.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found")
    return restaurant


@router.get("/restaurants/{restaurant_id}", response_model=RestaurantRead)
def get_restaurant(restaurant_id: UUID, db: Session = Depends(get_db)):
    restaurant = db.get(Restaurant, restaurant_id)
    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found")
    return serialize_restaurant(restaurant, db=db)


@router.get("/restaurants/{restaurant_id}/check-in/status", response_model=CheckInStatus)
def get_restaurant_check_in_status(
    restaurant_id: UUID,
    user_email: str | None = Query(default=None, min_length=3),
    db: Session = Depends(get_db),
):
    if not db.get(Restaurant, restaurant_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found")
    viewer_id = None
    if user_email:
        viewer_id = resolve_user_uuid(db, email=user_email)
    return CheckInStatus(**get_user_check_in_status(db, user_id=viewer_id, restaurant_id=restaurant_id))


@router.post("/restaurants/{restaurant_id}/check-in", response_model=CheckInResult)
def post_restaurant_check_in(
    restaurant_id: UUID,
    payload: CheckInPayload,
    db: Session = Depends(get_db),
):
    user = get_or_create_user(db, email=payload.user_email)
    try:
        result = create_check_in(
            db,
            user_id=user.id,
            restaurant_id=restaurant_id,
            latitude=payload.latitude,
            longitude=payload.longitude,
        )
    except CheckInError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "check_in", "message": exc.message},
        ) from exc
    return CheckInResult(**result)


@router.post("/restaurants", response_model=RestaurantRead, status_code=status.HTTP_201_CREATED)
def create_restaurant(payload: RestaurantCreate, db: Session = Depends(get_db)):
    restaurant = Restaurant(
        name=payload.name,
        city=payload.city,
        district=payload.district,
        address=payload.address,
        latitude=payload.latitude,
        longitude=payload.longitude,
        category=payload.category,
        geo_indications=[row.model_dump() for row in payload.geo_indications],
        has_geographical_indication=payload.has_geographical_indication,
        gi_product_name=payload.gi_product_name,
    )
    db.add(restaurant)
    db.commit()
    db.refresh(restaurant)
    return serialize_restaurant(restaurant, db=db)


@router.get("/restaurants/{restaurant_id}/reviews", response_model=list[ReviewRead])
def list_restaurant_reviews(
    restaurant_id: UUID,
    limit: int = Query(default=50, ge=1, le=200),
    viewer_id: str | None = Query(default=None),
    viewer_email: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    if not db.get(Restaurant, restaurant_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found")

    viewer_user_id = resolve_user_uuid(db, user_id=viewer_id, email=viewer_email)

    stmt = (
        select(Review)
        .where(Review.restaurant_id == restaurant_id)
        .options(
            selectinload(Review.category_scores),
            selectinload(Review.author),
            selectinload(Review.images),
            selectinload(Review.helpful_votes),
            selectinload(Review.replies).selectinload(ReviewReply.author),
        )
    )
    if viewer_user_id:
        own_first = case((Review.author_id == viewer_user_id, 0), else_=1)
        stmt = stmt.order_by(own_first, Review.created_at.desc())
    else:
        stmt = stmt.order_by(Review.created_at.desc())
    stmt = stmt.limit(limit)
    rows = db.scalars(stmt).all()
    return [serialize_review(row, viewer_user_id=viewer_user_id) for row in rows]


@router.post("/users/sync", response_model=UserProfile)
def sync_user(payload: UserSyncPayload, db: Session = Depends(get_db)):
    user = get_or_create_user(
        db,
        email=payload.email,
        full_name=payload.full_name,
        avatar_url=payload.avatar_url,
        google_sub=payload.google_sub,
        default_review_name_display=payload.default_review_name_display,
    )
    if payload.record_login:
        record_app_usage_event(db, event_type="user_login", user_id=user.id, platform="api")
    return serialize_user(user, db)


AVATAR_PRESET_CATALOG: list[AvatarPresetItem] = [
    AvatarPresetItem(id="chef", label="Sef", emoji="👨‍🍳"),
    AvatarPresetItem(id="olive", label="Zeytin", emoji="🫒"),
    AvatarPresetItem(id="coffee", label="Kahve", emoji="☕"),
    AvatarPresetItem(id="doner", label="Doner", emoji="🥙"),
    AvatarPresetItem(id="dessert", label="Tatli", emoji="🍮"),
    AvatarPresetItem(id="spice", label="Baharat", emoji="🌶️"),
]


@router.get("/users/avatar-presets", response_model=list[AvatarPresetItem])
def list_avatar_presets() -> list[AvatarPresetItem]:
    return AVATAR_PRESET_CATALOG


@router.get("/users/nickname/check", response_model=NicknameCheckResponse)
def check_nickname(
    nickname: str = Query(min_length=1, max_length=32),
    user_email: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    exclude_id = None
    if user_email:
        user = db.scalar(select(User).where(User.email == user_email.strip().lower()))
        if user:
            exclude_id = user.id
    error = check_nickname_available(db, nickname, exclude_user_id=exclude_id)
    if error:
        return NicknameCheckResponse(available=False, message=error.message, highlights=error.highlights)
    return NicknameCheckResponse(available=True)


@router.patch("/users/gourmet-profile", response_model=UserProfile)
def update_gourmet_profile(payload: GourmetProfileUpdate, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.user_email.strip().lower()))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kullanici bulunamadi.")

    updated = False

    if payload.nickname is not None:
        normalized = normalize_nickname(payload.nickname)
        error = check_nickname_available(db, normalized, exclude_user_id=user.id)
        if error:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"message": error.message, "highlights": error.highlights},
            )
        if user.nickname != normalized:
            user.nickname = normalized
            updated = True

    if payload.use_preset_avatar:
        if payload.avatar_preset is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="avatar_preset gerekli.",
            )
        try:
            validate_avatar_preset(payload.avatar_preset)
        except NicknameValidationError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.message) from exc
        if user.avatar_preset != payload.avatar_preset or user.avatar_url is not None:
            user.avatar_preset = payload.avatar_preset
            user.avatar_url = None
            updated = True

    if payload.default_review_name_display is not None:
        normalized_display = normalize_author_name_display(payload.default_review_name_display)
        if normalized_display == "nickname" and not user.nickname:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Yorumlarda takma ad icin once takma ad secmelisiniz.",
            )
        if user.default_review_name_display != normalized_display:
            user.default_review_name_display = normalized_display
            updated = True

    if updated:
        db.add(user)
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            err_text = str(exc.orig).lower() if exc.orig else str(exc).lower()
            if "nickname" in err_text or "ix_users_nickname_lower" in err_text:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={"message": "Bu takma ad zaten alinmis.", "highlights": []},
                ) from exc
            raise
        db.refresh(user)

    return serialize_user(user, db)


@router.post("/users/avatar", response_model=UserProfile)
async def upload_user_avatar(
    user_email: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    user = db.scalar(select(User).where(User.email == user_email.strip().lower()))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kullanici bulunamadi.")

    url = await save_user_avatar(file)
    user.avatar_url = url
    user.avatar_preset = None
    db.add(user)
    db.commit()
    db.refresh(user)
    return serialize_user(user, db)


@router.post("/feedback/private", response_model=PrivateFeedbackRead, status_code=status.HTTP_201_CREATED)
def create_private_feedback_endpoint(payload: PrivateFeedbackCreate, db: Session = Depends(get_db)):
    author_uuid = None
    if payload.author_id:
        try:
            author_uuid = UUID(payload.author_id)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid author_id") from exc
    elif payload.author_email:
        author = get_or_create_user(
            db,
            email=payload.author_email,
            full_name=payload.author_name,
            avatar_url=payload.author_avatar_url,
            google_sub=None,
        )
        author_uuid = author.id

    if not author_uuid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="author_id or author_email is required",
        )

    feedback = create_private_feedback(db, payload=payload, author_id=author_uuid)
    return serialize_private_feedback(feedback)


@router.get("/feedback/private/mine", response_model=list[PrivateFeedbackRead])
def list_my_private_feedbacks(
    author_id: str | None = Query(default=None),
    email: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    user_uuid = resolve_user_uuid(db, user_id=author_id, email=email)
    if not user_uuid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="author_id or email is required and must exist",
        )
    rows = list_private_feedbacks_for_user(db, user_uuid=user_uuid)
    return [serialize_private_feedback(row) for row in rows]


@router.get("/feedback/private", response_model=list[PrivateFeedbackRead])
def list_private_feedbacks_for_dashboard(
    actor_user_id: str | None = Query(default=None),
    actor_user_email: str | None = Query(default=None),
    actor_restaurant_id: str | None = Query(default=None),
    status_filter: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    rows = list_private_feedbacks_for_panel(
        db,
        actor_user_id=actor_user_id,
        actor_user_email=actor_user_email,
        actor_restaurant_id=actor_restaurant_id,
        status_filter=status_filter,
        limit=limit,
    )
    return [serialize_private_feedback(row) for row in rows]


@router.get("/feedback/private/{feedback_id}", response_model=PrivateFeedbackDetailRead)
def get_private_feedback_detail_endpoint(
    feedback_id: UUID,
    actor_user_id: str | None = Query(default=None),
    actor_user_email: str | None = Query(default=None),
    actor_restaurant_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    feedback, messages, latest_coupon = get_private_feedback_detail(
        db,
        feedback_id=feedback_id,
        actor_user_id=actor_user_id,
        actor_user_email=actor_user_email,
        actor_restaurant_id=actor_restaurant_id,
    )
    return PrivateFeedbackDetailRead(
        feedback=serialize_private_feedback(feedback),
        messages=[serialize_feedback_message(row) for row in messages],
        latest_coupon=serialize_compensation_coupon(latest_coupon) if latest_coupon else None,
    )


@router.post(
    "/feedback/private/{feedback_id}/messages",
    response_model=FeedbackMessageRead,
    status_code=status.HTTP_201_CREATED,
)
def create_feedback_message_endpoint(
    feedback_id: UUID,
    payload: FeedbackMessageCreate,
    db: Session = Depends(get_db),
):
    row = create_feedback_message(db, feedback_id=feedback_id, payload=payload)
    return serialize_feedback_message(row)


@router.patch("/feedback/private/{feedback_id}/status", response_model=PrivateFeedbackRead)
def update_private_feedback_status_endpoint(
    feedback_id: UUID,
    payload: PrivateFeedbackStatusUpdate,
    db: Session = Depends(get_db),
):
    row = update_private_feedback_status(
        db,
        feedback_id=feedback_id,
        status_value=payload.status,
        actor_user_id=payload.actor_user_id,
        actor_user_email=payload.actor_user_email,
        actor_restaurant_id=payload.actor_restaurant_id,
    )
    return serialize_private_feedback(row)


@router.post(
    "/feedback/private/{feedback_id}/compensation",
    response_model=CompensationIssueResponse,
    status_code=status.HTTP_201_CREATED,
)
def issue_compensation_coupon_endpoint(
    feedback_id: UUID,
    payload: CompensationCouponCreate,
    db: Session = Depends(get_db),
):
    coupon, feedback, notification_payload = issue_compensation_coupon(db, feedback_id=feedback_id, payload=payload)
    return CompensationIssueResponse(
        coupon=serialize_compensation_coupon(coupon),
        feedback_status=feedback.status,  # type: ignore[arg-type]
        notification_ready=True,
        notification_payload=notification_payload,
    )


@router.post("/reviews/moderate-text", response_model=ReviewTextModerateResponse)
def moderate_review_text(payload: ReviewTextModerateRequest) -> ReviewTextModerateResponse:
    violation = check_review_text(payload.review_text or "")
    if violation:
        return ReviewTextModerateResponse(
            allowed=False,
            message=violation.message,
            highlights=violation.highlights,
        )
    return ReviewTextModerateResponse(allowed=True)


@router.post("/reviews", response_model=ReviewRead, status_code=status.HTTP_201_CREATED)
async def create_review(payload: ReviewCreate, db: Session = Depends(get_db)):
    try:
        restaurant_id = UUID(payload.restaurant_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid restaurant_id") from exc

    restaurant = db.get(Restaurant, restaurant_id)
    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found")

    author_uuid = None
    author_name = payload.author_name
    author_user: User | None = None
    if payload.author_id:
        try:
            author_uuid = UUID(payload.author_id)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid author_id") from exc
        author_user = db.get(User, author_uuid)
    elif payload.author_email:
        author = get_or_create_user(
            db,
            email=payload.author_email,
            full_name=payload.author_name,
            avatar_url=payload.author_avatar_url,
            google_sub=None,
        )
        author_uuid = author.id
        author_user = author
        author_name = author_name or author.full_name

    if author_user:
        try:
            enforce_review_author_policy(author_user, payload.review_text or "")
        except ReviewModerationError as exc:
            _raise_review_moderation_error(exc)

    if not author_uuid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Yorum yazmak icin giris yapin (author_email gerekli).",
        )

    name_display = normalize_author_name_display(payload.author_name_display)
    if name_display == "nickname" and author_user and not author_user.nickname:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Yorumlarda takma ad icin once Gurme profilinizden takma ad secmelisiniz.",
        )
    if author_user:
        author_user.default_review_name_display = name_display
        db.add(author_user)

    review = Review(
        restaurant_id=restaurant_id,
        author_id=author_uuid,
        rating=payload.rating,
        review_text=(payload.review_text or "").strip(),
        review_lang="tr",
        is_demo=False,
        author_name_display=name_display,
    )
    db.add(review)
    db.commit()
    db.refresh(review, attribute_names=["author", "images", "category_scores"])
    record_app_usage_event(db, event_type="review_created", user_id=author_uuid, platform="api")

    if review.rating is not None and review.rating <= 2:
        ownership = db.scalar(
            select(RestaurantOwnership)
            .where(RestaurantOwnership.restaurant_id == restaurant_id)
            .options(selectinload(RestaurantOwnership.user), selectinload(RestaurantOwnership.subscription))
            .limit(1)
        )
        if ownership:
            try:
                await notify_negative_gastro_review(
                    db,
                    ownership=ownership,
                    review=review,
                    author_name=author_user.full_name if author_user else author_name,
                )
            except Exception:
                logger.exception("Negative review notification failed review=%s", review.id)

    return serialize_review(review, viewer_user_id=author_uuid)


@router.post("/reviews/{review_id}/images", response_model=ReviewRead)
async def upload_review_image(
    review_id: UUID,
    author_email: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    review = db.scalar(
        select(Review)
        .where(Review.id == review_id)
        .options(selectinload(Review.images), selectinload(Review.author), selectinload(Review.category_scores))
    )
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    if not review.author or review.author.email.lower() != author_email.strip().lower():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu yoruma fotograf ekleyemezsiniz.")

    existing = len(review.images or [])
    if existing >= MAX_REVIEW_IMAGES_PER_REVIEW:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"En fazla {MAX_REVIEW_IMAGES_PER_REVIEW} fotograf eklenebilir.",
        )

    url = await save_review_image(file)
    db.add(
        ReviewImage(
            review_id=review.id,
            image_url=url,
            sort_order=existing,
        )
    )
    db.commit()
    db.refresh(review, attribute_names=["author", "images", "category_scores"])
    return serialize_review(review)


@router.patch("/reviews/{review_id}", response_model=ReviewRead)
def update_review(review_id: UUID, payload: ReviewUpdate, db: Session = Depends(get_db)):
    review = load_review_or_404(db, review_id)
    user = resolve_actor_user(db, author_id=payload.author_id, author_email=payload.author_email)
    assert_review_owner(user, review)
    assert_gs_review_editable(review)

    next_rating = payload.rating if payload.rating is not None else review.rating
    next_text = review.review_text if payload.review_text is None else payload.review_text.strip()

    if payload.rating is None and payload.review_text is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Guncellenecek en az bir alan gerekli.",
        )

    try:
        enforce_review_author_policy(user, next_text)
    except ReviewModerationError as exc:
        _raise_review_moderation_error(exc)

    review.rating = next_rating
    review.review_text = next_text
    db.add(review)
    db.commit()
    review = load_review_or_404(db, review_id)
    return serialize_review(review, viewer_user_id=user.id)


@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(review_id: UUID, payload: ReviewAuthorAction, db: Session = Depends(get_db)):
    review = load_review_or_404(db, review_id)
    user = resolve_actor_user(db, author_id=payload.author_id, author_email=payload.author_email)
    assert_review_owner(user, review)
    assert_gs_review_editable(review)
    db.delete(review)
    db.commit()
    return None


@router.post("/reviews/{review_id}/helpful", response_model=ReviewRead)
def toggle_review_helpful(review_id: UUID, payload: ReviewAuthorAction, db: Session = Depends(get_db)):
    review = load_review_or_404(db, review_id)
    user = resolve_actor_user(db, author_id=payload.author_id, author_email=payload.author_email)

    if review.author_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Kendi yorumunuza yararli diyemezsiniz.",
        )

    existing = db.scalar(
        select(ReviewHelpfulVote).where(
            ReviewHelpfulVote.review_id == review.id,
            ReviewHelpfulVote.user_id == user.id,
        )
    )
    if existing:
        db.delete(existing)
    else:
        db.add(ReviewHelpfulVote(review_id=review.id, user_id=user.id))
        notify_review_helpful(db, review=review, actor=user)

    db.commit()
    review = load_review_or_404(db, review_id)
    return serialize_review(review, viewer_user_id=user.id)


@router.post("/reviews/{review_id}/replies", response_model=ReviewReplyRead, status_code=status.HTTP_201_CREATED)
def create_review_reply(review_id: UUID, payload: ReviewReplyCreate, db: Session = Depends(get_db)):
    review = load_review_or_404(db, review_id)
    user = resolve_actor_user(db, author_id=payload.author_id, author_email=payload.author_email)

    try:
        enforce_review_author_policy(user, payload.reply_text)
    except ReviewModerationError as exc:
        _raise_review_moderation_error(exc)

    reply = ReviewReply(
        review_id=review.id,
        author_id=user.id,
        reply_text=payload.reply_text.strip(),
    )
    db.add(reply)
    db.flush()
    notify_review_reply(db, review=review, reply=reply, actor=user)
    db.commit()
    db.refresh(reply, attribute_names=["author"])
    return serialize_review_reply(reply)


@router.patch("/reviews/{review_id}/replies/{reply_id}", response_model=ReviewReplyRead)
def update_review_reply(
    review_id: UUID,
    reply_id: UUID,
    payload: ReviewReplyUpdate,
    db: Session = Depends(get_db),
):
    review = load_review_or_404(db, review_id)
    user = resolve_actor_user(db, author_id=payload.author_id, author_email=payload.author_email)

    reply = db.scalar(
        select(ReviewReply)
        .where(ReviewReply.id == reply_id, ReviewReply.review_id == review.id)
        .options(selectinload(ReviewReply.author))
    )
    if not reply:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cevap bulunamadi.")

    if not reply.author_id or reply.author_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu cevabi duzenleyemezsiniz.")

    try:
        enforce_review_author_policy(user, payload.reply_text)
    except ReviewModerationError as exc:
        _raise_review_moderation_error(exc)

    reply.reply_text = payload.reply_text.strip()
    db.add(reply)
    db.commit()
    db.refresh(reply, attribute_names=["author"])
    return serialize_review_reply(reply)


@router.delete("/reviews/{review_id}/replies/{reply_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review_reply(
    review_id: UUID,
    reply_id: UUID,
    payload: ReviewAuthorAction,
    db: Session = Depends(get_db),
):
    review = load_review_or_404(db, review_id)
    user = resolve_actor_user(db, author_id=payload.author_id, author_email=payload.author_email)

    reply = db.scalar(
        select(ReviewReply).where(ReviewReply.id == reply_id, ReviewReply.review_id == review.id)
    )
    if not reply:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cevap bulunamadi.")

    if not reply.author_id or reply.author_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu cevabi silemezsiniz.")

    db.delete(reply)
    db.commit()
    return None


@router.post("/reviews/{review_id}/analyze", response_model=ReviewAnalyzeResponse)
async def analyze_review(review_id: UUID, db: Session = Depends(get_db)):
    review = db.get(Review, review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    analysis = await ai_service.analyze_review(review.review_text, rating=review.rating)

    review.sentiment_label = SentimentLabel(analysis["overall_sentiment"])
    review.sentiment_score = analysis["overall_score"]
    review.ai_summary = analysis["summary"]
    review.ai_raw_payload = analysis

    db.query(ReviewCategoryScore).filter(ReviewCategoryScore.review_id == review.id).delete()
    for row in analysis["categories"]:
        db.add(
            ReviewCategoryScore(
                review_id=review.id,
                category=row["category"],
                score=row["score"],
                label=SentimentLabel(row["label"]),
                reason=row["reason"],
            )
        )

    db.commit()
    return ReviewAnalyzeResponse(
        review_id=str(review.id),
        sentiment_label=analysis["overall_sentiment"],
        sentiment_score=analysis["overall_score"],
        summary=analysis["summary"],
        categories=analysis["categories"],
    )


@router.get("/restaurants/{restaurant_id}/google-review-link")
def get_google_review_link(restaurant_id: UUID, db: Session = Depends(get_db)):
    restaurant = db.get(Restaurant, restaurant_id)
    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found")

    stmt = select(RestaurantPlatformProfile).where(
        RestaurantPlatformProfile.restaurant_id == restaurant_id,
        RestaurantPlatformProfile.platform == PlatformName.google_maps,
    )
    profile = db.scalar(stmt)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Google Maps profile not found for restaurant",
        )

    place_id = profile.external_id
    return {
        "restaurant_id": str(restaurant_id),
        "platform": "google_maps",
        "place_id": place_id,
        "google_review_url": build_google_review_link(place_id),
        "maps_directions_url": (
            directions_url := build_google_maps_directions_url(
                place_id=place_id,
                latitude=restaurant.latitude,
                longitude=restaurant.longitude,
                query=build_destination_label(
                    name=restaurant.name,
                    address=restaurant.address,
                    city=restaurant.city,
                )
                or restaurant.name,
            )
        ),
        "maps_search_url": directions_url,
    }


router.include_router(auth_router)
router.include_router(panel_router)
router.include_router(metrics_router)
router.include_router(gourmet_chat_router)
router.include_router(social_router)


@router.post("/internal/cron/panel-notifications")
async def cron_panel_notifications(
    x_cron_secret: str | None = Header(default=None, alias="X-Cron-Secret"),
    db: Session = Depends(get_db),
):
    expected = settings.cron_secret
    if not expected or x_cron_secret != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized cron")
    stats = await run_scheduled_notification_jobs(db)
    return {"ok": True, "stats": stats}

