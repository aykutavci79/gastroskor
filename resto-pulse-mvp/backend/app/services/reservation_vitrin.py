"""Rezervasyon vitrini — basvuru, otomatik checklist, admin onay."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.constants.tester_restaurant_showcase import ATLAS_SOFRA_PLACE_ID
from app.models.entities import (
    ReservationVitrinStatus,
    Restaurant,
    RestaurantFloorPlan,
    RestaurantOwnership,
    User,
)
from app.services.reservation_floor_plan import normalize_layout
from app.services.restaurant_promo import subscription_allows_promo
from app.services.table_reservations import get_published_plan, online_reservations_configured
from app.services.tester_restaurant_visibility import is_tester_seed_ownership
from app.services.turkish_text_fold import fold_tr_ascii

MIN_VITRIN_TABLE_COUNT = 8
MIN_VITRIN_SEAT_CAPACITY = 20

# Sokak / fast-food / içecek-ağırlıklı — oturmalı vitrin dışı.
VITRIN_BLOCKED_CATEGORY_SLUGS = frozenset({"sokak", "burger", "kahve"})

VITRIN_BLOCKED_NAME_KEYWORDS = (
    "cig kofte",
    "ciğ köfte",
    "cigkofte",
    "fast food",
    "self servis",
    "self-servis",
    "paket servis",
    "sadece paket",
    "take away",
    "takeaway",
    "durumcu",
    "cantin",
    "kantin",
    "bufe",
    "büfe",
)

VITRIN_SIT_DOWN_CATEGORY_SLUGS = frozenset(
    {
        "kebap-izgara",
        "ev-yemekleri",
        "deniz",
        "kahvalti",
        "tatli-tuzlu",
        "firin",
        "salata-fit",
        "doner",
    }
)


@dataclass(frozen=True)
class VitrinChecklistItem:
    code: str
    label: str
    passed: bool
    detail: str


@dataclass(frozen=True)
class VitrinEligibilityResult:
    auto_reject: bool
    can_apply: bool
    items: tuple[VitrinChecklistItem, ...]

    @property
    def passed(self) -> bool:
        return all(item.passed for item in self.items)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _fold(value: str | None) -> str:
    return fold_tr_ascii((value or "").strip())


def _published_tables(plan: RestaurantFloorPlan | None) -> list[dict[str, Any]]:
    if not plan or not plan.published_layout:
        return []
    layout = normalize_layout(plan.published_layout)
    rows = layout.get("tables") or []
    return [row for row in rows if isinstance(row, dict) and not row.get("reservation_closed")]


def _table_stats(plan: RestaurantFloorPlan | None) -> tuple[int, int]:
    tables = _published_tables(plan)
    if not tables:
        return 0, 0
    seat_total = 0
    for row in tables:
        try:
            seats_max = int(row.get("seats_max") or row.get("seats_min") or 0)
        except (TypeError, ValueError):
            seats_max = 0
        seat_total += max(0, seats_max)
    return len(tables), seat_total


def _name_has_blocked_keyword(*values: str | None) -> str | None:
    haystack = _fold(" ".join(value for value in values if value))
    for keyword in VITRIN_BLOCKED_NAME_KEYWORDS:
        if _fold(keyword) in haystack:
            return keyword
    return None


def _category_blocked(tags: list[str] | None) -> bool:
    normalized = {tag.strip().lower() for tag in (tags or []) if tag and tag.strip()}
    if not normalized:
        return False
    blocked_hits = normalized & VITRIN_BLOCKED_CATEGORY_SLUGS
    if not blocked_hits:
        return False
    if normalized & VITRIN_SIT_DOWN_CATEGORY_SLUGS:
        return False
    return True


def evaluate_reservation_vitrin_eligibility(
    *,
    ownership: RestaurantOwnership,
    restaurant: Restaurant,
    plan: RestaurantFloorPlan | None,
) -> VitrinEligibilityResult:
    table_count, seat_capacity = _table_stats(plan)
    keyword = _name_has_blocked_keyword(restaurant.name, restaurant.category)
    category_blocked = _category_blocked(list(ownership.online_order_category_tags or []))
    subscription_ok = subscription_allows_promo(ownership.subscription)
    published_plan_ok = table_count > 0
    table_count_ok = table_count >= MIN_VITRIN_TABLE_COUNT
    seat_capacity_ok = seat_capacity >= MIN_VITRIN_SEAT_CAPACITY

    items = (
        VitrinChecklistItem(
            code="subscription",
            label="Aktif abonelik / deneme",
            passed=subscription_ok,
            detail="Deneme veya aktif abonelik gerekli.",
        ),
        VitrinChecklistItem(
            code="published_plan",
            label="Yayinlanmis salon plani",
            passed=published_plan_ok,
            detail="Panelden salon planini yayinlayin.",
        ),
        VitrinChecklistItem(
            code="table_count",
            label=f"En az {MIN_VITRIN_TABLE_COUNT} masa",
            passed=table_count_ok,
            detail=f"Mevcut: {table_count} masa",
        ),
        VitrinChecklistItem(
            code="seat_capacity",
            label=f"En az {MIN_VITRIN_SEAT_CAPACITY} kisi kapasitesi",
            passed=seat_capacity_ok,
            detail=f"Mevcut: {seat_capacity} kisi",
        ),
        VitrinChecklistItem(
            code="category",
            label="Oturmalı mekan kategorisi",
            passed=not category_blocked,
            detail="Sokak lezzeti / burger / kahve-only vitrin disi.",
        ),
        VitrinChecklistItem(
            code="name",
            label="Ad / tip kontrolu",
            passed=keyword is None,
            detail=f"Uygun degil anahtar: {keyword}" if keyword else "Uygun gorunuyor.",
        ),
    )

    hard_fail = (
        not subscription_ok
        or not published_plan_ok
        or keyword is not None
        or category_blocked
        or (table_count > 0 and table_count < 4)
    )
    auto_reject = hard_fail
    can_apply = not auto_reject
    return VitrinEligibilityResult(auto_reject=auto_reject, can_apply=can_apply, items=items)


def reservation_vitrin_listed(ownership: RestaurantOwnership | None) -> bool:
    if not ownership:
        return False
    if ownership.reservation_vitrin_status != ReservationVitrinStatus.approved:
        return False
    return online_reservations_configured(ownership)


def vitrin_status_value(ownership: RestaurantOwnership | None) -> str:
    if not ownership:
        return ReservationVitrinStatus.disabled.value
    return ownership.reservation_vitrin_status.value


def vitrin_payload_for_ownership(
    db: Session,
    *,
    ownership: RestaurantOwnership,
    restaurant: Restaurant | None = None,
) -> dict:
    restaurant = restaurant or ownership.restaurant
    plan = get_published_plan(db, restaurant_id=ownership.restaurant_id)
    eligibility = evaluate_reservation_vitrin_eligibility(
        ownership=ownership,
        restaurant=restaurant,
        plan=plan,
    )
    table_count, seat_capacity = _table_stats(plan)
    return {
        "status": vitrin_status_value(ownership),
        "listed": reservation_vitrin_listed(ownership),
        "applied_at": ownership.reservation_vitrin_applied_at.isoformat()
        if ownership.reservation_vitrin_applied_at
        else None,
        "decided_at": ownership.reservation_vitrin_decided_at.isoformat()
        if ownership.reservation_vitrin_decided_at
        else None,
        "reject_reason": ownership.reservation_vitrin_reject_reason,
        "table_count": table_count,
        "seat_capacity": seat_capacity,
        "can_apply": ownership.reservation_vitrin_status
        in {ReservationVitrinStatus.disabled, ReservationVitrinStatus.rejected}
        and eligibility.can_apply,
        "checklist": [
            {
                "code": item.code,
                "label": item.label,
                "passed": item.passed,
                "detail": item.detail,
            }
            for item in eligibility.items
        ],
    }


def apply_reservation_vitrin(db: Session, *, ownership: RestaurantOwnership) -> dict:
    restaurant = ownership.restaurant
    if not restaurant:
        raise ValueError("Restoran bulunamadi.")
    if ownership.reservation_vitrin_status == ReservationVitrinStatus.approved:
        raise ValueError("Rezervasyon vitrini zaten onayli.")
    if ownership.reservation_vitrin_status == ReservationVitrinStatus.pending:
        raise ValueError("Basvurunuz zaten inceleniyor.")
    if not ownership.online_reservations_enabled:
        raise ValueError("Once panelden online rezervasyonu acin.")

    plan = get_published_plan(db, restaurant_id=ownership.restaurant_id)
    eligibility = evaluate_reservation_vitrin_eligibility(
        ownership=ownership,
        restaurant=restaurant,
        plan=plan,
    )
    now = _utcnow()
    ownership.reservation_vitrin_applied_at = now

    if eligibility.auto_reject:
        ownership.reservation_vitrin_status = ReservationVitrinStatus.rejected
        ownership.reservation_vitrin_decided_at = now
        ownership.reservation_vitrin_decided_by = "system:auto"
        ownership.reservation_vitrin_reject_reason = _auto_reject_reason(eligibility)
    else:
        ownership.reservation_vitrin_status = ReservationVitrinStatus.pending
        ownership.reservation_vitrin_decided_at = None
        ownership.reservation_vitrin_decided_by = None
        ownership.reservation_vitrin_reject_reason = None

    db.add(ownership)
    db.commit()
    db.refresh(ownership)
    return vitrin_payload_for_ownership(db, ownership=ownership, restaurant=restaurant)


def _auto_reject_reason(eligibility: VitrinEligibilityResult) -> str:
    failed = [item.label for item in eligibility.items if not item.passed]
    return "Otomatik uygunluk kontrolu: " + "; ".join(failed)


def approve_reservation_vitrin(
    db: Session,
    *,
    ownership_id: UUID,
    admin_email: str,
) -> RestaurantOwnership:
    ownership = db.get(RestaurantOwnership, ownership_id)
    if not ownership:
        raise ValueError("Mekan bulunamadi.")
    if not ownership.online_reservations_enabled:
        raise ValueError("Restoran online rezervasyonu acmamis.")
    now = _utcnow()
    ownership.reservation_vitrin_status = ReservationVitrinStatus.approved
    ownership.reservation_vitrin_decided_at = now
    ownership.reservation_vitrin_decided_by = admin_email.strip().lower()
    ownership.reservation_vitrin_reject_reason = None
    if not ownership.reservation_vitrin_applied_at:
        ownership.reservation_vitrin_applied_at = now
    db.add(ownership)
    db.commit()
    db.refresh(ownership)
    return ownership


def reject_reservation_vitrin(
    db: Session,
    *,
    ownership_id: UUID,
    admin_email: str,
    reason: str | None = None,
) -> RestaurantOwnership:
    ownership = db.get(RestaurantOwnership, ownership_id)
    if not ownership:
        raise ValueError("Mekan bulunamadi.")
    ownership.reservation_vitrin_status = ReservationVitrinStatus.rejected
    ownership.reservation_vitrin_decided_at = _utcnow()
    ownership.reservation_vitrin_decided_by = admin_email.strip().lower()
    ownership.reservation_vitrin_reject_reason = (reason or "").strip() or "Vitrin basvurusu uygun bulunmadi."
    db.add(ownership)
    db.commit()
    db.refresh(ownership)
    return ownership


def suspend_reservation_vitrin(
    db: Session,
    *,
    ownership_id: UUID,
    admin_email: str,
    reason: str | None = None,
) -> RestaurantOwnership:
    ownership = db.get(RestaurantOwnership, ownership_id)
    if not ownership:
        raise ValueError("Mekan bulunamadi.")
    ownership.reservation_vitrin_status = ReservationVitrinStatus.suspended
    ownership.reservation_vitrin_decided_at = _utcnow()
    ownership.reservation_vitrin_decided_by = admin_email.strip().lower()
    ownership.reservation_vitrin_reject_reason = (reason or "").strip() or "Vitrin gecici olarak kapatildi."
    db.add(ownership)
    db.commit()
    db.refresh(ownership)
    return ownership


def list_vitrin_applications(db: Session, *, status: str | None = None, limit: int = 100) -> list[dict]:
    query = (
        select(RestaurantOwnership, Restaurant, User)
        .join(Restaurant, Restaurant.id == RestaurantOwnership.restaurant_id)
        .join(User, User.id == RestaurantOwnership.user_id)
        .order_by(RestaurantOwnership.reservation_vitrin_applied_at.desc().nullslast())
        .limit(max(1, min(limit, 200)))
    )
    if status:
        try:
            enum_status = ReservationVitrinStatus(status.strip().lower())
        except ValueError:
            enum_status = None
        if enum_status is not None:
            query = query.where(RestaurantOwnership.reservation_vitrin_status == enum_status)

    rows = db.execute(query).all()
    result: list[dict] = []
    for ownership, restaurant, user in rows:
        if ownership.reservation_vitrin_status == ReservationVitrinStatus.disabled:
            continue
        plan = get_published_plan(db, restaurant_id=ownership.restaurant_id)
        table_count, seat_capacity = _table_stats(plan)
        result.append(
            {
                "ownership_id": str(ownership.id),
                "restaurant_id": str(restaurant.id),
                "restaurant_name": restaurant.name,
                "restaurant_city": restaurant.city,
                "restaurant_category": restaurant.category,
                "owner_email": user.email,
                "owner_name": user.full_name,
                "google_place_id": ownership.google_place_id,
                "status": ownership.reservation_vitrin_status.value,
                "online_reservations_enabled": bool(ownership.online_reservations_enabled),
                "table_count": table_count,
                "seat_capacity": seat_capacity,
                "online_order_categories": list(ownership.online_order_category_tags or []),
                "applied_at": ownership.reservation_vitrin_applied_at.isoformat()
                if ownership.reservation_vitrin_applied_at
                else None,
                "decided_at": ownership.reservation_vitrin_decided_at.isoformat()
                if ownership.reservation_vitrin_decided_at
                else None,
                "reject_reason": ownership.reservation_vitrin_reject_reason,
                "tester_seed": is_tester_seed_ownership(ownership),
            }
        )
    return result


def approve_tester_showcase_vitrin(ownership: RestaurantOwnership) -> None:
    if ownership.google_place_id != ATLAS_SOFRA_PLACE_ID:
        return
    now = _utcnow()
    ownership.reservation_vitrin_status = ReservationVitrinStatus.approved
    ownership.reservation_vitrin_applied_at = ownership.reservation_vitrin_applied_at or now
    ownership.reservation_vitrin_decided_at = now
    ownership.reservation_vitrin_decided_by = "system:seed"
    ownership.reservation_vitrin_reject_reason = None


def export_reservation_restaurant_contacts(db: Session) -> list[dict]:
    rows = db.execute(
        select(RestaurantOwnership, Restaurant, User)
        .join(Restaurant, Restaurant.id == RestaurantOwnership.restaurant_id)
        .join(User, User.id == RestaurantOwnership.user_id)
        .where(RestaurantOwnership.online_reservations_enabled.is_(True))
        .order_by(Restaurant.name.asc())
    ).all()
    contacts: list[dict] = []
    for ownership, restaurant, user in rows:
        plan = get_published_plan(db, restaurant_id=ownership.restaurant_id)
        table_count, seat_capacity = _table_stats(plan)
        contacts.append(
            {
                "restaurant_name": restaurant.name,
                "restaurant_city": restaurant.city,
                "owner_email": user.email,
                "owner_name": user.full_name,
                "owner_phone": ownership.phone_e164 or ownership.promo_direct_order_phone,
                "vitrin_status": ownership.reservation_vitrin_status.value,
                "vitrin_listed": reservation_vitrin_listed(ownership),
                "table_count": table_count,
                "seat_capacity": seat_capacity,
                "google_place_id": ownership.google_place_id,
            }
        )
    return contacts
