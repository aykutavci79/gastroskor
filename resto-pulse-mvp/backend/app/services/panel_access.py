from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.models import RestaurantOwnership, RestaurantSubscription, User


@dataclass
class PanelAccessState:
    has_ownership: bool
    can_access_panel: bool
    panel_tier: str | None
    verification_status: str | None
    subscription_status: str | None
    trial_days_left: int | None
    competitor_limit: int
    can_write_actions: bool
    pricing_next: str | None
    ownership_id: str | None
    restaurant_id: str | None
    restaurant_name: str | None
    google_place_id: str | None
    pending_visit: bool


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def refresh_subscription_state(db: Session, subscription: RestaurantSubscription) -> None:
    now = _utcnow()
    if subscription.status == "trial" and subscription.trial_ends_at and subscription.trial_ends_at <= now:
        subscription.status = "lapsed"
        db.add(subscription)
    if subscription.status == "active" and subscription.paid_until and subscription.paid_until <= now:
        subscription.status = "lapsed"
        db.add(subscription)


def start_trial(db: Session, ownership: RestaurantOwnership) -> RestaurantSubscription:
    subscription = ownership.subscription
    now = _utcnow()
    if subscription is None:
        subscription = RestaurantSubscription(
            ownership_id=ownership.id,
            status="trial",
            trial_started_at=now,
            trial_ends_at=now + timedelta(days=settings.trial_days),
            ai_analysis_interval_days=33,
            ai_analysis_plan="standart",
        )
        db.add(subscription)
        db.flush()
        ownership.subscription = subscription
    elif subscription.trial_started_at is None:
        subscription.status = "trial"
        subscription.trial_started_at = now
        subscription.trial_ends_at = now + timedelta(days=settings.trial_days)
        db.add(subscription)
    return subscription


def get_user_ownership(db: Session, user_id: UUID) -> RestaurantOwnership | None:
    return db.scalars(
        select(RestaurantOwnership)
        .where(RestaurantOwnership.user_id == user_id)
        .options(
            selectinload(RestaurantOwnership.subscription),
            selectinload(RestaurantOwnership.restaurant),
            selectinload(RestaurantOwnership.competitors),
        )
        .order_by(RestaurantOwnership.created_at.desc())
        .limit(1)
    ).first()


def get_ownership_for_restaurant(db: Session, user_id: UUID, restaurant_id: UUID) -> RestaurantOwnership | None:
    return db.scalar(
        select(RestaurantOwnership)
        .where(RestaurantOwnership.user_id == user_id, RestaurantOwnership.restaurant_id == restaurant_id)
        .options(selectinload(RestaurantOwnership.subscription), selectinload(RestaurantOwnership.restaurant))
    )


def build_panel_access_state(db: Session, ownership: RestaurantOwnership | None) -> PanelAccessState:
    if ownership is None:
        return PanelAccessState(
            has_ownership=False,
            can_access_panel=False,
            panel_tier=None,
            verification_status=None,
            subscription_status=None,
            trial_days_left=None,
            competitor_limit=0,
            can_write_actions=False,
            pricing_next=None,
            ownership_id=None,
            restaurant_id=None,
            restaurant_name=None,
            google_place_id=None,
            pending_visit=False,
        )

    subscription = ownership.subscription
    if subscription:
        refresh_subscription_state(db, subscription)

    allowed_statuses = {"verified_sms", "verified", "pending_visit"}
    has_panel_record = ownership.verification_status in allowed_statuses
    subscription_ok = subscription is not None and subscription.status in {"trial", "active"}
    can_access = has_panel_record and subscription_ok and ownership.verification_status != "rejected"

    trial_days_left = None
    subscription_status = subscription.status if subscription else None
    if subscription and subscription.status == "trial" and subscription.trial_ends_at:
        delta = subscription.trial_ends_at - _utcnow()
        trial_days_left = max(0, int(delta.total_seconds() // 86400) + (1 if delta.total_seconds() % 86400 else 0))

    competitor_limit = 0
    if can_access:
        competitor_limit = 5 if subscription and subscription.status == "active" else 1

    can_write = (
        can_access
        and ownership.panel_tier == "full"
        and ownership.verification_status in {"verified_sms", "verified"}
    )

    pricing_next = None
    if subscription and subscription.status in {"trial", "lapsed"}:
        pricing_next = "399" if not subscription.intro_price_used else "599"
    elif subscription and subscription.status == "active":
        pricing_next = "599"

    return PanelAccessState(
        has_ownership=True,
        can_access_panel=can_access,
        panel_tier=ownership.panel_tier,
        verification_status=ownership.verification_status,
        subscription_status=subscription_status,
        trial_days_left=trial_days_left,
        competitor_limit=competitor_limit,
        can_write_actions=can_write,
        pricing_next=pricing_next,
        ownership_id=str(ownership.id),
        restaurant_id=str(ownership.restaurant_id),
        restaurant_name=ownership.restaurant.name if ownership.restaurant else None,
        google_place_id=ownership.google_place_id,
        pending_visit=ownership.verification_status == "pending_visit",
    )


def assert_panel_read_access(db: Session, user: User, restaurant_id: UUID) -> RestaurantOwnership:
    ownership = get_ownership_for_restaurant(db, user.id, restaurant_id)
    if not ownership and user.role == "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin should pass explicit ownership")
    if not ownership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Restaurant ownership not found")

    state = build_panel_access_state(db, ownership)
    if not state.can_access_panel and user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Panel access expired or unavailable")
    return ownership


def assert_panel_write_access(db: Session, user: User, restaurant_id: UUID) -> RestaurantOwnership:
    ownership = assert_panel_read_access(db, user, restaurant_id)
    if user.role == "admin":
        return ownership
    state = build_panel_access_state(db, ownership)
    if not state.can_write_actions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Full panel required for this action (visit verification or SMS verification)",
        )
    return ownership


def assert_verified_owner_for_restaurant(
    db: Session,
    user: User,
    restaurant_id: UUID,
    *,
    require_write: bool = False,
) -> RestaurantOwnership:
    if user.role == "admin":
        ownership = db.scalar(select(RestaurantOwnership).where(RestaurantOwnership.restaurant_id == restaurant_id))
        if ownership:
            return ownership
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No ownership record for restaurant")

    if require_write:
        return assert_panel_write_access(db, user, restaurant_id)
    return assert_panel_read_access(db, user, restaurant_id)
