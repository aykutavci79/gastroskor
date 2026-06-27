from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.integrations.google_places_live import GooglePlacesLiveClient, is_usable_google_place_id
from app.models import PanelNotification, RestaurantCompetitor, RestaurantOwnership, Review
from app.services.panel_access import build_panel_access_state
from app.services.panel_ai_quota import resolve_interval_days, scheduled_analysis_available
from app.services.panel_notification_service import panel_base_url, send_panel_notification

logger = logging.getLogger(__name__)
google_client = GooglePlacesLiveClient()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _days_until(target: datetime | None) -> int | None:
    if target is None:
        return None
    return (target.date() - _utcnow().date()).days


async def notify_negative_gastro_review(
    db: Session,
    *,
    ownership: RestaurantOwnership,
    review: Review,
    author_name: str | None,
) -> None:
    from app.services.review_remedy_service import REMEDY_MAX_RATING

    if review.rating is None or review.rating > REMEDY_MAX_RATING:
        return
    name = author_name or "Bir kullanici"
    stars = review.rating
    restaurant_id = str(review.restaurant_id)
    if review.publication_status == "pending_restaurant":
        title = "Olumsuz geri bildirim — telafi şansı"
        message = (
            f"{name} {stars} yıldız verdi. 24 saat içinde telafi teklifi sunabilirsiniz; "
            f"müşteri kabul ederse yorum kamuya yayınlanmaz."
        )
        cta_url = f"{panel_base_url()}/panel?tab=remedy"
    else:
        title = "🚨 Yeni olumsuz yorum!"
        message = f"{name} restoranına {stars} yildiz verdi. Hemen yanitla!"
        cta_url = f"{settings_public_site()}/restaurants/{restaurant_id}#reviews"
    await send_panel_notification(
        db,
        ownership=ownership,
        notification_type="negative_review",
        title=title,
        message=message,
        cta_label="Panele git →",
        cta_url=cta_url,
        dedupe_key=f"negative_review:gastro:{review.id}",
        metadata={"review_id": str(review.id), "source": "gastroskor", "rating": stars},
    )


async def notify_new_online_order(
    db: Session,
    *,
    ownership: RestaurantOwnership,
    order,
) -> None:
    from app.services.restaurant_orders import order_to_dict

    summary = order_to_dict(order)
    line_count = len(summary.get("lines") or [])
    total = summary.get("total_tl")
    customer = summary.get("customer_name") or "Musteri"
    phone = summary.get("customer_phone") or ""
    restaurant_id = str(order.restaurant_id)
    await send_panel_notification(
        db,
        ownership=ownership,
        notification_type="new_order",
        title="Yeni online siparis!",
        message=f"{customer} — {line_count} kalem, {total} TL. Tel: {phone}",
        cta_label="Siparislere git",
        cta_url=f"{panel_base_url()}/panel?tab=orders",
        dedupe_key=f"new_order:{order.id}",
        metadata={"order_id": str(order.id), "restaurant_id": restaurant_id, "total_tl": total},
    )


async def notify_new_reservation(
    db: Session,
    *,
    ownership: RestaurantOwnership,
    reservation,
) -> None:
    from app.services.table_reservations import reservation_to_dict, zone_label_tr

    summary = reservation_to_dict(reservation)
    when = summary.get("reserved_at") or ""
    zone = zone_label_tr(summary.get("zone") or "")
    table = summary.get("table_label") or "Masa"
    party = summary.get("party_size")
    customer = summary.get("customer_name") or "Musteri"
    phone = summary.get("customer_phone") or ""
    restaurant_id = str(reservation.restaurant_id)
    await send_panel_notification(
        db,
        ownership=ownership,
        notification_type="new_reservation",
        title="Yeni masa rezervasyonu!",
        message=f"{customer} — {zone} {table}, {party} kisi. Tel: {phone}",
        cta_label="Rezervasyonlara git",
        cta_url=f"{panel_base_url()}/panel?tab=reservations",
        dedupe_key=f"new_reservation:{reservation.id}",
        metadata={
            "reservation_id": str(reservation.id),
            "restaurant_id": restaurant_id,
            "reserved_at": when,
        },
    )


def settings_public_site() -> str:
    from app.core.config import settings

    return settings.public_site_base_url.rstrip("/")


async def process_trial_ending_notifications(db: Session) -> int:
    sent = 0
    rows = db.scalars(
        select(RestaurantOwnership)
        .options(selectinload(RestaurantOwnership.subscription), selectinload(RestaurantOwnership.user))
        .join(RestaurantOwnership.subscription)
    ).all()
    for ownership in rows:
        sub = ownership.subscription
        if not sub or sub.status != "trial" or not sub.trial_ends_at:
            continue
        if not build_panel_access_state(db, ownership).can_access_panel:
            continue
        days_left = _days_until(sub.trial_ends_at)
        if days_left != 3:
            continue
        pricing = "399"
        result = await send_panel_notification(
            db,
            ownership=ownership,
            notification_type="trial_ending",
            title="⏰ Ucretsiz donemin 3 gun sonra bitiyor",
            message=(
                "Pro uye olursan 5 rakip analizi, haftalik raporlar ve anlik yorum alarmlari "
                f"seni bekliyor. Ilk ay sadece {pricing} TL!"
            ),
            cta_label="Devam Et →",
            cta_url=f"{panel_base_url()}?upgrade=1",
            dedupe_key=f"trial_ending:{ownership.id}:{sub.trial_ends_at.date().isoformat()}",
            metadata={"days_left": days_left},
        )
        if result:
            sent += 1
    return sent


async def process_analysis_approaching_notifications(db: Session) -> int:
    sent = 0
    rows = db.scalars(
        select(RestaurantOwnership)
        .options(selectinload(RestaurantOwnership.subscription), selectinload(RestaurantOwnership.user))
    ).all()
    for ownership in rows:
        sub = ownership.subscription
        if not sub or sub.status != "trial":
            continue
        if ownership.last_competitor_ai_at is None:
            continue
        if not build_panel_access_state(db, ownership).can_access_panel:
            continue
        interval = resolve_interval_days(sub)
        next_at = ownership.last_competitor_ai_at + timedelta(days=interval)
        days_left = _days_until(next_at)
        if days_left != 2:
            continue
        result = await send_panel_notification(
            db,
            ownership=ownership,
            notification_type="analysis_approaching",
            title="🔥 Rakip analizin 2 gun sonra hazir!",
            message=(
                "Rakibinin bu ay ne yorumlar aldigini merak ediyor musun? Pro uye olursan analizi "
                "hemen alabilirsin, 33 gun bekleme!"
            ),
            cta_label="Pro Uye Ol →",
            cta_url=f"{panel_base_url()}?upgrade=1",
            dedupe_key=f"analysis_approaching:{ownership.id}:{next_at.date().isoformat()}",
            metadata={"days_until": days_left, "next_at": next_at.isoformat()},
        )
        if result:
            sent += 1
    return sent


async def process_analysis_ready_notifications(db: Session) -> int:
    sent = 0
    rows = db.scalars(
        select(RestaurantOwnership)
        .options(selectinload(RestaurantOwnership.subscription), selectinload(RestaurantOwnership.user))
    ).all()
    for ownership in rows:
        sub = ownership.subscription
        if not sub:
            continue
        if ownership.last_competitor_ai_at is None:
            continue
        if not build_panel_access_state(db, ownership).can_access_panel:
            continue
        interval = resolve_interval_days(sub)
        if not scheduled_analysis_available(ownership, interval):
            continue
        next_cycle = ownership.last_competitor_ai_at + timedelta(days=interval)
        result = await send_panel_notification(
            db,
            ownership=ownership,
            notification_type="analysis_ready",
            title="📊 Rakip analizin hazir!",
            message="33 gunluk rakip analizin seni bekliyor. Hemen incele!",
            cta_label="Analizi Gor →",
            cta_url=f"{panel_base_url()}#competitors",
            dedupe_key=f"analysis_ready:{ownership.id}:{next_cycle.date().isoformat()}",
            metadata={"interval_days": interval},
        )
        if result:
            sent += 1
    return sent


async def sync_competitor_and_review_alerts(db: Session) -> dict[str, int]:
    stats = {"competitor": 0, "google_negative": 0, "errors": 0}
    ownerships = db.scalars(
        select(RestaurantOwnership)
        .options(
            selectinload(RestaurantOwnership.subscription),
            selectinload(RestaurantOwnership.user),
            selectinload(RestaurantOwnership.competitors),
            selectinload(RestaurantOwnership.restaurant),
        )
    ).all()

    for ownership in ownerships:
        if not build_panel_access_state(db, ownership).can_access_panel:
            continue

        try:
            await _poll_google_negative_reviews(db, ownership, stats)
        except Exception:
            logger.exception("Google negative review poll failed ownership=%s", ownership.id)
            stats["errors"] += 1

        for competitor in ownership.competitors:
            try:
                await _sync_competitor_row(db, ownership, competitor, stats)
            except Exception:
                logger.exception("Competitor sync failed competitor=%s", competitor.id)
                stats["errors"] += 1

    return stats


async def _poll_google_negative_reviews(db: Session, ownership: RestaurantOwnership, stats: dict) -> None:
    place_id = (ownership.google_place_id or "").strip()
    if not is_usable_google_place_id(place_id):
        if place_id:
            logger.info(
                "Google negative review poll skipped — invalid place_id ownership=%s place_id=%r",
                ownership.id,
                place_id,
            )
        return
    try:
        details = await google_client.get_place_details(place_id)
    except ValueError as exc:
        logger.info(
            "Google negative review poll skipped ownership=%s: %s",
            ownership.id,
            exc,
        )
        return
    for review in details.get("reviews") or []:
        rating = review.get("rating")
        if rating is None or float(rating) > 2:
            continue
        author = review.get("author_name") or "Google kullanicisi"
        review_time = review.get("time")
        dedupe = f"negative_review:google:{place_id}:{review_time}:{author}"
        existing = db.scalar(
            select(PanelNotification.id).where(
                PanelNotification.ownership_id == ownership.id,
                PanelNotification.dedupe_key == dedupe,
            )
        )
        if existing:
            continue
        restaurant_id = str(ownership.restaurant_id)
        result = await send_panel_notification(
            db,
            ownership=ownership,
            notification_type="negative_review",
            title="🚨 Yeni olumsuz yorum!",
            message=f"{author} restoranına {rating} yildiz verdi. Hemen yanitla!",
            cta_label="Yorumu Gor →",
            cta_url=f"{settings_public_site()}/restaurants/{restaurant_id}#reviews",
            dedupe_key=dedupe,
            metadata={"source": "google", "rating": rating, "author": author},
        )
        if result:
            stats["google_negative"] += 1


async def _sync_competitor_row(
    db: Session,
    ownership: RestaurantOwnership,
    competitor: RestaurantCompetitor,
    stats: dict,
) -> None:
    place_id = (competitor.google_place_id or "").strip()
    if not is_usable_google_place_id(place_id):
        logger.info(
            "Competitor sync skipped — invalid place_id competitor=%s name=%r place_id=%r",
            competitor.id,
            competitor.competitor_name,
            place_id or None,
        )
        return
    try:
        details = await google_client.get_place_details(place_id)
    except ValueError as exc:
        logger.info(
            "Competitor sync skipped competitor=%s: %s",
            competitor.id,
            exc,
        )
        return
    new_rating = details.get("rating")
    new_count = details.get("user_ratings_total")
    old_count = competitor.last_review_count
    old_rating = competitor.last_rating

    changed = False
    if new_count is not None and old_count is not None and int(new_count) > int(old_count):
        changed = True
    if new_rating is not None and old_rating is not None and float(new_rating) != float(old_rating):
        changed = True
    if old_count is None and new_count is not None:
        changed = False

    competitor.last_rating = float(new_rating) if new_rating is not None else competitor.last_rating
    competitor.last_review_count = int(new_count) if new_count is not None else competitor.last_review_count
    competitor.last_synced_at = _utcnow()
    db.add(competitor)

    if changed:
        result = await send_panel_notification(
            db,
            ownership=ownership,
            notification_type="competitor_update",
            title="📈 Rakibinizde yeni hareket!",
            message=(
                f"{competitor.competitor_name} icin Google'da yeni puan/yorum guncellendi. "
                "Okumak icin GastroSkor panele giris yapiniz."
            ),
            cta_label="Paneli Ac →",
            cta_url=f"{panel_base_url()}#competitors",
            dedupe_key=(
                f"competitor_update:{competitor.id}:"
                f"{competitor.last_review_count}:{competitor.last_rating}"
            ),
            metadata={
                "competitor_id": str(competitor.id),
                "competitor_name": competitor.competitor_name,
                "rating": competitor.last_rating,
                "review_count": competitor.last_review_count,
            },
        )
        if result:
            stats["competitor"] += 1

    db.commit()


async def run_scheduled_notification_jobs(db: Session) -> dict:
    from app.services.review_remedy_service import process_review_remedy_expirations

    sync_stats = await sync_competitor_and_review_alerts(db)
    remedy_stats = process_review_remedy_expirations(db)
    return {
        "trial_ending": await process_trial_ending_notifications(db),
        "analysis_approaching": await process_analysis_approaching_notifications(db),
        "analysis_ready": await process_analysis_ready_notifications(db),
        "review_remedy": remedy_stats,
        **sync_stats,
    }
