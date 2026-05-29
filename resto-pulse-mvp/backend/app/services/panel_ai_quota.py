from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.models import RestaurantOwnership, RestaurantSubscription

DEFAULT_AI_INTERVAL_DAYS = 33
PLAN_LABELS = {
    33: ("standart", "Standart (33 gunde bir AI analizi)"),
    7: ("haftalik", "Haftalik AI paketi"),
    1: ("gunluk", "Gunluk AI paketi"),
}


@dataclass
class AiQuotaState:
    can_run: bool
    scheduled_available: bool
    extra_credits: int
    will_use_extra_credit: bool
    interval_days: int
    plan_key: str
    plan_label: str
    last_analysis_at: datetime | None
    next_analysis_at: datetime | None
    days_until_next: int | None
    message: str


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def extra_credits_for(subscription: RestaurantSubscription | None) -> int:
    if subscription is None:
        return 0
    return max(0, int(subscription.ai_extra_credits or 0))


def resolve_interval_days(subscription: RestaurantSubscription | None) -> int:
    if subscription is None:
        return settings.default_ai_analysis_interval_days
    days = subscription.ai_analysis_interval_days or settings.default_ai_analysis_interval_days
    return max(1, int(days))


def resolve_plan_meta(interval_days: int) -> tuple[str, str]:
    if interval_days in PLAN_LABELS:
        return PLAN_LABELS[interval_days]
    if interval_days <= 1:
        return PLAN_LABELS[1]
    if interval_days <= 7:
        return PLAN_LABELS[7]
    return PLAN_LABELS[33]


def scheduled_analysis_available(ownership: RestaurantOwnership, interval_days: int) -> bool:
    last_at = ownership.last_competitor_ai_at
    if last_at is None:
        return True
    return _utcnow() >= last_at + timedelta(days=interval_days)


def build_ai_quota(ownership: RestaurantOwnership) -> AiQuotaState:
    subscription = ownership.subscription
    interval_days = resolve_interval_days(subscription)
    plan_key, plan_label = resolve_plan_meta(interval_days)
    last_at = ownership.last_competitor_ai_at
    credits = extra_credits_for(subscription)
    scheduled_ok = scheduled_analysis_available(ownership, interval_days)

    if scheduled_ok:
        if last_at is None:
            msg = "Ilk AI rakip analiziniz hazir (trial hediyesi)."
        else:
            msg = "Yeni AI analizi yapabilirsiniz."
        return AiQuotaState(
            can_run=True,
            scheduled_available=True,
            extra_credits=credits,
            will_use_extra_credit=False,
            interval_days=interval_days,
            plan_key=plan_key,
            plan_label=plan_label,
            last_analysis_at=last_at,
            next_analysis_at=None,
            days_until_next=0,
            message=msg,
        )

    next_at = last_at + timedelta(days=interval_days) if last_at else None
    now = _utcnow()
    days_left = 0
    if next_at:
        days_left = max(0, (next_at.date() - now.date()).days)
        if days_left == 0:
            days_left = 1

    if credits > 0:
        return AiQuotaState(
            can_run=True,
            scheduled_available=False,
            extra_credits=credits,
            will_use_extra_credit=True,
            interval_days=interval_days,
            plan_key=plan_key,
            plan_label=plan_label,
            last_analysis_at=last_at,
            next_analysis_at=next_at,
            days_until_next=days_left,
            message=(
                f"Planli analiz {days_left} gun sonra. "
                f"{credits} ekstra hakkiniz var — simdi kullanabilirsiniz."
            ),
        )

    next_label = next_at.strftime("%d.%m.%Y") if next_at else "?"
    return AiQuotaState(
        can_run=False,
        scheduled_available=False,
        extra_credits=0,
        will_use_extra_credit=False,
        interval_days=interval_days,
        plan_key=plan_key,
        plan_label=plan_label,
        last_analysis_at=last_at,
        next_analysis_at=next_at,
        days_until_next=days_left,
        message=(
            f"Sonraki planli AI analizi yaklasik {days_left} gun sonra ({next_label}). "
            "Erken analiz veya haftalik/gunluk paket asagidan satin alinabilir."
        ),
    )


def record_ai_analysis(ownership: RestaurantOwnership, *, use_extra_credit: bool) -> None:
    subscription = ownership.subscription
    if use_extra_credit:
        if subscription is None or extra_credits_for(subscription) < 1:
            raise ValueError("Ekstra AI hakki yok.")
        subscription.ai_extra_credits = extra_credits_for(subscription) - 1
        return
    ownership.last_competitor_ai_at = _utcnow()


def ai_quota_as_dict(quota: AiQuotaState) -> dict:
    return {
        "can_run": quota.can_run,
        "scheduled_available": quota.scheduled_available,
        "extra_credits": quota.extra_credits,
        "will_use_extra_credit": quota.will_use_extra_credit,
        "interval_days": quota.interval_days,
        "plan_key": quota.plan_key,
        "plan_label": quota.plan_label,
        "last_analysis_at": quota.last_analysis_at.isoformat() if quota.last_analysis_at else None,
        "next_analysis_at": quota.next_analysis_at.isoformat() if quota.next_analysis_at else None,
        "days_until_next": quota.days_until_next,
        "message": quota.message,
    }
