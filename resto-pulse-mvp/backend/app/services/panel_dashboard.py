from __future__ import annotations

from dataclasses import asdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import PrivateFeedback, RestaurantAnalyticsEvent, RestaurantCompetitor, RestaurantOwnership, Review
from app.models.entities import RestaurantPlatformProfile, PlatformName
from app.services.panel_access import PanelAccessState, build_panel_access_state
from app.services.panel_ai_quota import ai_quota_as_dict, build_ai_quota
from app.services.panel_pricing import pricing_catalog_as_dict
from app.services.restaurant_orders import count_accepted_orders
from app.services.review_remedy_service import public_rating_filter


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _count_events(db: Session, *, restaurant_id, event_type: str, since: datetime) -> int:
    return (
        db.scalar(
            select(func.count(RestaurantAnalyticsEvent.id)).where(
                RestaurantAnalyticsEvent.restaurant_id == restaurant_id,
                RestaurantAnalyticsEvent.event_type == event_type,
                RestaurantAnalyticsEvent.created_at >= since,
            )
        )
        or 0
    )


def build_dashboard_payload(db: Session, ownership: RestaurantOwnership, access: PanelAccessState) -> dict:
    now = _utcnow()
    day_ago = now - timedelta(days=1)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    six_months_ago = now - timedelta(days=180)

    restaurant_id = ownership.restaurant_id
    open_feedback = (
        db.scalar(
            select(func.count(PrivateFeedback.id)).where(
                PrivateFeedback.restaurant_id == restaurant_id,
                PrivateFeedback.status.in_(("open", "in_review")),
            )
        )
        or 0
    )

    gastro_review_count = (
        db.scalar(
            select(func.count(Review.id)).where(
                Review.restaurant_id == restaurant_id,
                public_rating_filter(),
            )
        )
        or 0
    )
    gastro_avg = db.scalar(
        select(func.avg(Review.rating)).where(
            Review.restaurant_id == restaurant_id,
            public_rating_filter(),
        )
    )

    google_profile = db.scalar(
        select(RestaurantPlatformProfile).where(
            RestaurantPlatformProfile.restaurant_id == restaurant_id,
            RestaurantPlatformProfile.platform == PlatformName.google_maps,
        )
    )

    competitors = db.scalars(
        select(RestaurantCompetitor)
        .where(RestaurantCompetitor.ownership_id == ownership.id)
        .order_by(RestaurantCompetitor.created_at.asc())
    ).all()

    return {
        "access": asdict(access),
        "restaurant": {
            "id": str(restaurant_id),
            "name": ownership.restaurant.name if ownership.restaurant else None,
            "google_place_id": ownership.google_place_id,
        },
        "summary": {
            "open_feedback_count": int(open_feedback),
            "maps_clicks_week": _count_events(db, restaurant_id=restaurant_id, event_type="maps_click", since=week_ago),
            "profile_views_week": _count_events(
                db, restaurant_id=restaurant_id, event_type="profile_view", since=week_ago
            ),
            "search_impressions_week": _count_events(
                db, restaurant_id=restaurant_id, event_type="search_impression", since=week_ago
            ),
            "maps_clicks_day": _count_events(db, restaurant_id=restaurant_id, event_type="maps_click", since=day_ago),
            "maps_clicks_month": _count_events(
                db, restaurant_id=restaurant_id, event_type="maps_click", since=month_ago
            ),
            "online_orders_accepted_total": count_accepted_orders(db, restaurant_id=restaurant_id),
            "online_orders_accepted_180_days": count_accepted_orders(
                db, restaurant_id=restaurant_id, since=six_months_ago
            ),
        },
        "ratings": {
            "google_rating": google_profile.avg_rating if google_profile else None,
            "google_review_count": google_profile.review_count if google_profile else None,
            "gastro_avg_rating": round(float(gastro_avg), 2) if gastro_avg is not None else None,
            "gastro_review_count": int(gastro_review_count),
        },
        "competitors": [
            {
                "id": str(row.id),
                "google_place_id": row.google_place_id,
                "name": row.competitor_name,
                "rating": row.last_rating,
                "review_count": row.last_review_count,
            }
            for row in competitors
        ],
        "ai_insight": _build_ai_insight(access, competitors, open_feedback),
        "ai_quota": ai_quota_as_dict(build_ai_quota(ownership)),
        "ai_pricing": pricing_catalog_as_dict(),
    }


def _build_ai_insight(access: PanelAccessState, competitors: list, open_feedback: int) -> str:
    if not access.can_access_panel:
        return "Panel erisimi aktif degil."
    parts: list[str] = []
    if open_feedback > 0:
        parts.append(f"{open_feedback} acik sikayet var; hizli yanit memnuniyeti artirir.")
    if competitors:
        top = competitors[0]
        parts.append(
            f"Takip ettiginiz {top.competitor_name} su an Google'da "
            f"{top.last_rating or '-'} puan ve {top.last_review_count or '-'} yorumda."
        )
    if access.panel_tier == "limited":
        parts.append("Ziyaret dogrulamasi sonrasi mesaj ve kupon ozellikleri acilacak.")
    elif access.trial_days_left is not None:
        parts.append(f"Deneme suresi: {access.trial_days_left} gun kaldi.")
    if not parts:
        return "Veri toplaniyor. Birkaç gun sonra gorunurluk ve rakip karsilastirmasi dolacak."
    return " ".join(parts)
