#!/usr/bin/env python3
"""Online rezervasyon E2E kurulum + smoke test (lokal Postgres gerekir)."""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.constants.tester_online_restaurants import TESTER_OWNER_EMAIL, TESTER_RESTAURANTS
from app.db.session import SessionLocal
from app.models import Restaurant, RestaurantOwnership, User
from app.services.reservation_floor_plan import normalize_layout
from app.services.table_reservations import (
    confirm_reservation_by_customer,
    create_table_reservation,
    decide_reservation,
    get_published_plan,
    online_reservations_configured,
    publish_floor_plan,
    save_draft_floor_plan,
)
from app.services.restaurant_promo import subscription_allows_promo


def _sample_layout() -> dict:
    return normalize_layout(
        {
            "tables": [
                {
                    "id": "t-salon-1",
                    "zone": "salon",
                    "label": "S1",
                    "seats_min": 2,
                    "seats_max": 4,
                    "x": 0.35,
                    "y": 0.45,
                },
                {
                    "id": "t-bahce-1",
                    "zone": "bahce",
                    "label": "B1",
                    "seats_min": 2,
                    "seats_max": 6,
                    "x": 0.65,
                    "y": 0.55,
                },
            ],
            "pois": [{"id": "p-giris", "kind": "entrance", "label": "Giris", "x": 0.1, "y": 0.5}],
        }
    )


def _pick_tester_ownership(db: Session) -> RestaurantOwnership:
    seed = TESTER_RESTAURANTS[0]
    place_id = f"gastro-tester-{seed.key}"
    ownership = db.scalar(
        select(RestaurantOwnership)
        .where(RestaurantOwnership.google_place_id == place_id)
        .options(
            selectinload(RestaurantOwnership.restaurant),
            selectinload(RestaurantOwnership.subscription),
        )
    )
    if not ownership:
        raise RuntimeError(
            "Tester restoran bulunamadi. Once POST /api/v1/dev/seed-tester-online-restaurants calistirin."
        )
    return ownership


def setup_reservation_demo(db: Session) -> dict:
    ownership = _pick_tester_ownership(db)
    if not subscription_allows_promo(ownership.subscription):
        raise RuntimeError("Tester restoran aboneligi aktif degil.")

    ownership.online_reservations_enabled = True
    save_draft_floor_plan(
        db,
        restaurant_id=ownership.restaurant_id,
        layout=_sample_layout(),
        background_url=None,
    )
    publish_floor_plan(db, restaurant_id=ownership.restaurant_id)
    db.commit()

    return {
        "restaurant_id": str(ownership.restaurant_id),
        "restaurant_name": ownership.restaurant.name,
        "owner_email": TESTER_OWNER_EMAIL,
    }


def run_smoke(db: Session, *, customer_email: str, phone: str = "05323971194") -> dict:
    ownership = _pick_tester_ownership(db)
    restaurant = db.get(Restaurant, ownership.restaurant_id)
    user = db.scalar(select(User).where(User.email == customer_email))
    if not restaurant or not user:
        raise RuntimeError(f"Restoran veya kullanici yok: customer={customer_email}")

    if not online_reservations_configured(ownership):
        raise RuntimeError("online_reservations_configured false — once setup calistirin.")

    plan = get_published_plan(db, restaurant_id=restaurant.id)
    if not plan:
        raise RuntimeError("Yayinlanmis plan yok.")

    reserved_at = datetime.now(timezone.utc) + timedelta(hours=3)
    reserved_at = reserved_at.replace(minute=0, second=0, microsecond=0)

    reservation = create_table_reservation(
        db,
        restaurant=restaurant,
        ownership=ownership,
        user=user,
        table_id="t-salon-1",
        party_size=2,
        reserved_at=reserved_at,
        note="E2E smoke test",
        customer_phone=phone,
        customer_name=user.nickname,
    )

    reservation = decide_reservation(
        db,
        reservation_id=reservation.id,
        restaurant_id=restaurant.id,
        decision="approved",
    )
    reservation = confirm_reservation_by_customer(
        db,
        reservation_id=reservation.id,
        user_id=user.id,
    )

    return {
        "reservation_id": str(reservation.id),
        "status": reservation.status.value,
        "restaurant_id": str(restaurant.id),
        "table_label": reservation.table_label,
        "reserved_at": reservation.reserved_at.isoformat(),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Rezervasyon E2E kurulum/smoke")
    parser.add_argument("action", choices=["setup", "smoke", "all"])
    parser.add_argument("--customer-email", default="coolisback@gmail.com")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.action in {"setup", "all"}:
            info = setup_reservation_demo(db)
            print("SETUP_OK", info)
        if args.action in {"smoke", "all"}:
            result = run_smoke(db, customer_email=args.customer_email.strip().lower())
            print("SMOKE_OK", result)
    except Exception as exc:
        print("FAILED", exc, file=sys.stderr)
        return 1
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
