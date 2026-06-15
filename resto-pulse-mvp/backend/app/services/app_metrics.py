"""Uygulama KPI: olay kaydi ve ozet."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import String, and_, case, cast, func, select
from sqlalchemy.orm import Session

from app.models import AppUsageEvent, Review, User

TZ_TR = ZoneInfo("Europe/Istanbul")

ALLOWED_CLIENT_EVENTS = frozenset({"session_start", "session_end"})

MOBILE_PLATFORMS = frozenset({"ios", "android"})


def _platform_is_web(platform_col):
    return func.lower(func.coalesce(platform_col, "")) == "web"


def _platform_is_mobile(platform_col):
    lowered = func.lower(func.coalesce(platform_col, ""))
    return lowered.in_(tuple(MOBILE_PLATFORMS))


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


def _visitor_key():
    return func.coalesce(cast(AppUsageEvent.user_id, String), AppUsageEvent.session_id)


def _platform_visitor_count(platform_filter):
    return func.count(func.distinct(_visitor_key())).filter(
        and_(AppUsageEvent.event_type == "session_start", platform_filter)
    )


def _platform_session_count(platform_filter):
    return func.sum(
        case(
            (and_(AppUsageEvent.event_type == "session_start", platform_filter), 1),
            else_=0,
        )
    )


def _platform_avg_session(platform_filter):
    return func.avg(
        case(
            (
                and_(AppUsageEvent.event_type == "session_end", platform_filter),
                AppUsageEvent.duration_seconds,
            ),
            else_=None,
        )
    )


def build_metrics_summary(db: Session, *, days: int = 30) -> dict:
    days = max(1, min(days, 365))
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days - 1)
    since = since.replace(hour=0, minute=0, second=0, microsecond=0)

    day_col = func.date_trunc("day", AppUsageEvent.created_at).label("day")
    actor_key = func.coalesce(cast(AppUsageEvent.user_id, String), AppUsageEvent.session_id)
    web_filter = _platform_is_web(AppUsageEvent.platform)
    mobile_filter = _platform_is_mobile(AppUsageEvent.platform)

    session_users = (
        select(
            day_col,
            func.count(func.distinct(actor_key)).label("unique_users"),
            func.sum(case((AppUsageEvent.event_type == "session_start", 1), else_=0)).label("sessions"),
            _platform_visitor_count(web_filter).label("web_visitors"),
            _platform_session_count(web_filter).label("web_sessions"),
            _platform_visitor_count(mobile_filter).label("mobile_visitors"),
            _platform_session_count(mobile_filter).label("mobile_sessions"),
            func.avg(
                case(
                    (AppUsageEvent.event_type == "session_end", AppUsageEvent.duration_seconds),
                    else_=None,
                )
            ).label("avg_session_seconds"),
            _platform_avg_session(web_filter).label("web_avg_session_seconds"),
            _platform_avg_session(mobile_filter).label("mobile_avg_session_seconds"),
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

    user_day_col = func.date_trunc("day", User.created_at).label("day")
    registrations_by_day = {
        row.day.date().isoformat(): int(row.cnt)
        for row in db.execute(
            select(user_day_col, func.count(User.id).label("cnt"))
            .where(User.created_at >= since)
            .group_by(user_day_col)
        ).all()
    }

    now_tr = datetime.now(TZ_TR)
    today_tr_start = now_tr.replace(hour=0, minute=0, second=0, microsecond=0)
    today_tr_end = today_tr_start + timedelta(days=1)
    new_registrations_today = (
        db.scalar(
            select(func.count(User.id)).where(
                User.created_at >= today_tr_start,
                User.created_at < today_tr_end,
            )
        )
        or 0
    )
    new_users_today_rows = db.execute(
        select(User.email, User.full_name, User.created_at)
        .where(User.created_at >= today_tr_start, User.created_at < today_tr_end)
        .order_by(User.created_at.desc())
        .limit(100)
    ).all()

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
                "web_visitors": int(usage.web_visitors if usage else 0),
                "web_sessions": int(usage.web_sessions if usage else 0),
                "mobile_visitors": int(usage.mobile_visitors if usage else 0),
                "mobile_sessions": int(usage.mobile_sessions if usage else 0),
                "avg_session_seconds": (
                    round(float(usage.avg_session_seconds), 1)
                    if usage and usage.avg_session_seconds is not None
                    else None
                ),
                "web_avg_session_seconds": (
                    round(float(usage.web_avg_session_seconds), 1)
                    if usage and usage.web_avg_session_seconds is not None
                    else None
                ),
                "mobile_avg_session_seconds": (
                    round(float(usage.mobile_avg_session_seconds), 1)
                    if usage and usage.mobile_avg_session_seconds is not None
                    else None
                ),
                "logins": int(usage.logins if usage else 0),
                "live_searches": int(usage.live_searches if usage else 0),
                "reviews": reviews_by_day.get(key, 0),
                "new_registrations": registrations_by_day.get(key, 0),
            }
        )
        cursor += timedelta(days=1)

    totals_usage = db.execute(
        select(
            func.count(func.distinct(actor_key)).label("unique_users"),
            func.sum(case((AppUsageEvent.event_type == "session_start", 1), else_=0)).label("sessions"),
            _platform_visitor_count(web_filter).label("web_visitors"),
            _platform_session_count(web_filter).label("web_sessions"),
            _platform_visitor_count(mobile_filter).label("mobile_visitors"),
            _platform_session_count(mobile_filter).label("mobile_sessions"),
            func.avg(
                case(
                    (AppUsageEvent.event_type == "session_end", AppUsageEvent.duration_seconds),
                    else_=None,
                )
            ).label("avg_session_seconds"),
            _platform_avg_session(web_filter).label("web_avg_session_seconds"),
            _platform_avg_session(mobile_filter).label("mobile_avg_session_seconds"),
            func.sum(case((AppUsageEvent.event_type == "user_login", 1), else_=0)).label("logins"),
            func.sum(case((AppUsageEvent.event_type == "live_search", 1), else_=0)).label("live_searches"),
        ).where(AppUsageEvent.created_at >= since)
    ).one()

    total_reviews = db.scalar(
        select(func.count(Review.id)).where(Review.created_at >= since, Review.is_demo.is_(False))
    )
    total_users = db.scalar(select(func.count(User.id))) or 0
    period_new_registrations = (
        db.scalar(select(func.count(User.id)).where(User.created_at >= since)) or 0
    )

    return {
        "period_days": days,
        "totals": {
            "unique_users": int(totals_usage.unique_users or 0),
            "sessions": int(totals_usage.sessions or 0),
            "web_visitors": int(totals_usage.web_visitors or 0),
            "web_sessions": int(totals_usage.web_sessions or 0),
            "mobile_visitors": int(totals_usage.mobile_visitors or 0),
            "mobile_sessions": int(totals_usage.mobile_sessions or 0),
            "avg_session_seconds": (
                round(float(totals_usage.avg_session_seconds), 1)
                if totals_usage.avg_session_seconds is not None
                else None
            ),
            "web_avg_session_seconds": (
                round(float(totals_usage.web_avg_session_seconds), 1)
                if totals_usage.web_avg_session_seconds is not None
                else None
            ),
            "mobile_avg_session_seconds": (
                round(float(totals_usage.mobile_avg_session_seconds), 1)
                if totals_usage.mobile_avg_session_seconds is not None
                else None
            ),
            "logins": int(totals_usage.logins or 0),
            "live_searches": int(totals_usage.live_searches or 0),
            "reviews": int(total_reviews or 0),
            "total_registered_users": int(total_users),
            "new_registrations": int(period_new_registrations),
            "new_registrations_today": int(new_registrations_today),
        },
        "daily": daily,
        "new_users_today": [
            {
                "email": row.email,
                "full_name": row.full_name,
                "created_at": row.created_at.astimezone(TZ_TR).isoformat(),
            }
            for row in new_users_today_rows
        ],
    }
