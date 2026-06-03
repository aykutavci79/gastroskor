"""Uygulama KPI: olay kaydi ve ozet."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import String, case, cast, func, select
from sqlalchemy.orm import Session

from app.models import AppUsageEvent, Review, User

ALLOWED_CLIENT_EVENTS = frozenset({"session_start", "session_end"})


def record_app_usage_event(
    db: Session,
    *,
    event_type: str,
    user_id: UUID | None = None,
    session_id: str | None = None,
    duration_seconds: int | None = None,
    platform: str | None = None,
    app_version: str | None = None,
    metadata: dict | None = None,
) -> None:
    row = AppUsageEvent(
        event_type=event_type,
        user_id=user_id,
        session_id=session_id,
        duration_seconds=duration_seconds,
        platform=platform,
        app_version=app_version,
        metadata_json=metadata,
    )
    db.add(row)
    db.commit()


def build_metrics_summary(db: Session, *, days: int = 30) -> dict:
    days = max(1, min(days, 365))
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days - 1)
    since = since.replace(hour=0, minute=0, second=0, microsecond=0)

    day_col = func.date_trunc("day", AppUsageEvent.created_at).label("day")
    actor_key = func.coalesce(cast(AppUsageEvent.user_id, String), AppUsageEvent.session_id)

    session_users = (
        select(
            day_col,
            func.count(func.distinct(actor_key)).label("unique_users"),
            func.sum(case((AppUsageEvent.event_type == "session_start", 1), else_=0)).label("sessions"),
            func.avg(
                case(
                    (AppUsageEvent.event_type == "session_end", AppUsageEvent.duration_seconds),
                    else_=None,
                )
            ).label("avg_session_seconds"),
            func.sum(case((AppUsageEvent.event_type == "user_login", 1), else_=0)).label("logins"),
            func.sum(case((AppUsageEvent.event_type == "live_search", 1), else_=0)).label("live_searches"),
        )
        .where(AppUsageEvent.created_at >= since)
        .group_by(day_col)
    )
    usage_by_day = {row.day.date().isoformat(): row for row in db.execute(session_users).all()}

    review_day_col = func.date_trunc("day", Review.created_at).label("day")
    reviews_by_day = {
        row.day.date().isoformat(): int(row.cnt)
        for row in db.execute(
            select(review_day_col, func.count(Review.id).label("cnt"))
            .where(Review.created_at >= since, Review.is_demo.is_(False))
            .group_by(review_day_col)
        ).all()
    }

    daily: list[dict] = []
    cursor = since.date()
    end_date = now.date()
    while cursor <= end_date:
        key = cursor.isoformat()
        usage = usage_by_day.get(key)
        daily.append(
            {
                "date": key,
                "unique_users": int(usage.unique_users if usage else 0),
                "sessions": int(usage.sessions if usage else 0),
                "avg_session_seconds": (
                    round(float(usage.avg_session_seconds), 1)
                    if usage and usage.avg_session_seconds is not None
                    else None
                ),
                "logins": int(usage.logins if usage else 0),
                "live_searches": int(usage.live_searches if usage else 0),
                "reviews": reviews_by_day.get(key, 0),
            }
        )
        cursor += timedelta(days=1)

    totals_usage = db.execute(
        select(
            func.count(func.distinct(actor_key)).label("unique_users"),
            func.sum(case((AppUsageEvent.event_type == "session_start", 1), else_=0)).label("sessions"),
            func.avg(
                case(
                    (AppUsageEvent.event_type == "session_end", AppUsageEvent.duration_seconds),
                    else_=None,
                )
            ).label("avg_session_seconds"),
            func.sum(case((AppUsageEvent.event_type == "user_login", 1), else_=0)).label("logins"),
            func.sum(case((AppUsageEvent.event_type == "live_search", 1), else_=0)).label("live_searches"),
        ).where(AppUsageEvent.created_at >= since)
    ).one()

    total_reviews = db.scalar(
        select(func.count(Review.id)).where(Review.created_at >= since, Review.is_demo.is_(False))
    )
    total_users = db.scalar(select(func.count(User.id))) or 0

    return {
        "period_days": days,
        "totals": {
            "unique_users": int(totals_usage.unique_users or 0),
            "sessions": int(totals_usage.sessions or 0),
            "avg_session_seconds": (
                round(float(totals_usage.avg_session_seconds), 1)
                if totals_usage.avg_session_seconds is not None
                else None
            ),
            "logins": int(totals_usage.logins or 0),
            "live_searches": int(totals_usage.live_searches or 0),
            "reviews": int(total_reviews or 0),
            "total_registered_users": int(total_users),
        },
        "daily": daily,
    }
