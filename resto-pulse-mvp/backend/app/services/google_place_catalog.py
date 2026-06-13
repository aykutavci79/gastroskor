"""Google Places canli arama sonuclarini kalici Postgres havuzunda tut."""

from __future__ import annotations

from datetime import datetime, timezone

from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.integrations.google_places_live import LivePlaceResult
from app.models import GooglePlaceCatalog, PlatformName, RestaurantPlatformProfile
from app.schemas.live_places import LivePlaceSearchItem
from app.services.live_search_metrics import build_live_search_source_stats, normalize_catalog_source_query
from app.services.profanity_tr import normalize_review_text


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_name(value: str) -> str:
    return normalize_review_text(value).strip()


def _catalog_to_live_place(row: GooglePlaceCatalog) -> LivePlaceResult:
    return LivePlaceResult(
        place_id=row.google_place_id,
        name=row.name,
        formatted_address=row.address,
        rating=row.rating,
        user_ratings_total=row.user_ratings_total,
        latitude=row.latitude,
        longitude=row.longitude,
        photo_reference=row.photo_reference,
    )


def _restaurant_id_for_place(db: Session, place_id: str) -> UUID | None:
    profile = db.scalar(
        select(RestaurantPlatformProfile).where(
            RestaurantPlatformProfile.platform == PlatformName.google_maps,
            RestaurantPlatformProfile.external_id == place_id,
        )
    )
    if not profile:
        return None
    return profile.restaurant_id


def search_catalog_places(
    db: Session,
    *,
    query: str,
    city: str,
    limit: int = 20,
) -> list[LivePlaceResult]:
    q = query.strip()
    if len(q) < 2:
        return []

    folded = _normalize_name(q)
    pattern = f"%{q}%"
    folded_pattern = f"%{folded}%" if folded else pattern

    rows = db.scalars(
        select(GooglePlaceCatalog)
        .where(
            GooglePlaceCatalog.city.ilike(f"%{city.strip()}%"),
            or_(
                GooglePlaceCatalog.name.ilike(pattern),
                GooglePlaceCatalog.name_normalized.ilike(folded_pattern),
                GooglePlaceCatalog.last_source_query.ilike(pattern),
            ),
        )
        .order_by(GooglePlaceCatalog.seen_count.desc(), GooglePlaceCatalog.rating.desc().nullslast())
        .limit(limit)
    ).all()

    return [_catalog_to_live_place(row) for row in rows]


def _upsert_catalog_row(
    db: Session,
    *,
    place_id: str,
    name: str,
    city: str,
    address: str | None,
    latitude: float | None,
    longitude: float | None,
    rating: float | None,
    user_ratings_total: int | None,
    photo_reference: str | None,
    source_query: str | None,
) -> None:
    if not place_id or not name.strip():
        return

    now = _utcnow()
    normalized = _normalize_name(name)
    existing = db.scalar(
        select(GooglePlaceCatalog).where(GooglePlaceCatalog.google_place_id == place_id)
    )
    restaurant_id = _restaurant_id_for_place(db, place_id)

    if existing:
        existing.name = name.strip()
        existing.name_normalized = normalized or existing.name_normalized
        existing.city = city.strip() or existing.city
        if address:
            existing.address = address
        if latitude is not None:
            existing.latitude = latitude
        if longitude is not None:
            existing.longitude = longitude
        if rating is not None:
            existing.rating = rating
        if user_ratings_total is not None:
            existing.user_ratings_total = user_ratings_total
        if photo_reference:
            existing.photo_reference = photo_reference
        if restaurant_id:
            existing.restaurant_id = restaurant_id
        if source_query:
            existing.last_source_query = source_query[:255]
        existing.seen_count = int(existing.seen_count or 0) + 1
        existing.last_seen_at = now
        return

    db.add(
        GooglePlaceCatalog(
            google_place_id=place_id,
            name=name.strip(),
            name_normalized=normalized or name.strip().lower(),
            city=city.strip() or "Bursa",
            address=address,
            latitude=latitude,
            longitude=longitude,
            rating=rating,
            user_ratings_total=user_ratings_total,
            photo_reference=photo_reference,
            restaurant_id=restaurant_id,
            seen_count=1,
            last_source_query=(source_query or "")[:255] or None,
            first_seen_at=now,
            last_seen_at=now,
        )
    )


def persist_live_place_results(
    db: Session,
    places: list[LivePlaceResult],
    *,
    city: str,
    source_query: str | None = None,
) -> int:
    count = 0
    for place in places:
        if not place.place_id:
            continue
        _upsert_catalog_row(
            db,
            place_id=place.place_id,
            name=place.name,
            city=city,
            address=place.formatted_address,
            latitude=place.latitude,
            longitude=place.longitude,
            rating=place.rating,
            user_ratings_total=place.user_ratings_total,
            photo_reference=place.photo_reference,
            source_query=source_query,
        )
        count += 1
    if count:
        db.commit()
    return count


def persist_search_items(
    db: Session,
    items: list[LivePlaceSearchItem],
    *,
    city: str,
    source_query: str | None = None,
) -> int:
    rows: list[LivePlaceResult] = []
    for item in items:
        rows.append(
            LivePlaceResult(
                place_id=item.place_id,
                name=item.name,
                formatted_address=item.address,
                rating=item.rating,
                user_ratings_total=item.user_ratings_total,
                latitude=item.latitude,
                longitude=item.longitude,
                photo_reference=None,
            )
        )
    return persist_live_place_results(db, rows, city=city, source_query=source_query)


def count_catalog_places(db: Session, *, city: str | None = None) -> int:
    stmt = select(func.count()).select_from(GooglePlaceCatalog)
    if city:
        stmt = stmt.where(GooglePlaceCatalog.city.ilike(f"%{city.strip()}%"))
    return int(db.scalar(stmt) or 0)


def build_catalog_stats(
    db: Session,
    *,
    recent_limit: int = 10,
    top_queries_limit: int = 10,
    search_stats_days: int = 30,
) -> dict:
    total_places = count_catalog_places(db)
    total_seen_events = int(
        db.scalar(select(func.coalesce(func.sum(GooglePlaceCatalog.seen_count), 0))) or 0
    )
    linked_restaurants = int(
        db.scalar(
            select(func.count())
            .select_from(GooglePlaceCatalog)
            .where(GooglePlaceCatalog.restaurant_id.is_not(None))
        )
        or 0
    )

    city_rows = db.execute(
        select(GooglePlaceCatalog.city, func.count())
        .group_by(GooglePlaceCatalog.city)
        .order_by(func.count().desc(), GooglePlaceCatalog.city.asc())
    ).all()
    by_city = [{"city": row[0], "count": int(row[1])} for row in city_rows]

    query_rows = db.execute(
        select(GooglePlaceCatalog.last_source_query, func.count())
        .where(GooglePlaceCatalog.last_source_query.is_not(None))
        .where(GooglePlaceCatalog.last_source_query != "")
        .group_by(GooglePlaceCatalog.last_source_query)
    ).all()
    grouped_queries: dict[str, int] = {}
    for raw_query, count in query_rows:
        if not raw_query:
            continue
        key = normalize_catalog_source_query(raw_query) or raw_query.strip().lower()
        grouped_queries[key] = grouped_queries.get(key, 0) + int(count)
    top_queries = [
        {"query": query, "count": count}
        for query, count in sorted(grouped_queries.items(), key=lambda row: (-row[1], row[0]))[
            :top_queries_limit
        ]
    ]

    recent_rows = db.scalars(
        select(GooglePlaceCatalog)
        .order_by(GooglePlaceCatalog.last_seen_at.desc())
        .limit(recent_limit)
    ).all()
    recent_places = [
        {
            "name": row.name,
            "city": row.city,
            "rating": row.rating,
            "seen_count": int(row.seen_count or 0),
            "last_source_query": row.last_source_query,
            "last_seen_at": row.last_seen_at,
        }
        for row in recent_rows
    ]

    return {
        "total_places": total_places,
        "total_seen_events": total_seen_events,
        "linked_restaurants": linked_restaurants,
        "by_city": by_city,
        "top_queries": top_queries,
        "search_performance": build_live_search_source_stats(db, days=search_stats_days),
        "recent_places": recent_places,
    }
