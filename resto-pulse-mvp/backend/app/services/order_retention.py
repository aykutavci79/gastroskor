"""Siparis PII retention — 5 yil sonra anonimlestir ve kaydi temizle."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import RestaurantOrder, RestaurantOrderLine, RestaurantOrderStatus
from app.services.account_deletion import ANONYMIZED_ORDER_PHONE

logger = logging.getLogger(__name__)

BATCH_SIZE = 200


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _retention_cutoff() -> datetime:
    years = max(1, int(settings.order_retention_years))
    return _utcnow() - timedelta(days=365 * years)


def _order_has_pii(order: RestaurantOrder) -> bool:
    if order.customer_phone != ANONYMIZED_ORDER_PHONE:
        return True
    if order.customer_name or order.customer_address or order.note:
        return True
    if order.reject_reason_text:
        return True
    return False


def run_order_retention(db: Session, *, dry_run: bool = False) -> dict[str, int | bool | str]:
    """5 yildan eski siparislerde PII anonimlestir, ardindan siparis kaydini sil."""
    cutoff = _retention_cutoff()
    stats: dict[str, int | bool | str] = {
        "dry_run": dry_run,
        "cutoff": cutoff.isoformat(),
        "retention_years": settings.order_retention_years,
        "anonymized": 0,
        "deleted": 0,
        "skipped_pending": 0,
        "batches": 0,
    }

    while True:
        rows = db.scalars(
            select(RestaurantOrder)
            .where(
                RestaurantOrder.created_at < cutoff,
                RestaurantOrder.status != RestaurantOrderStatus.pending,
            )
            .order_by(RestaurantOrder.created_at.asc())
            .limit(BATCH_SIZE)
        ).all()
        if not rows:
            break

        stats["batches"] = int(stats["batches"]) + 1
        to_delete_ids: list = []

        for order in rows:
            if order.status == RestaurantOrderStatus.pending:
                stats["skipped_pending"] = int(stats["skipped_pending"]) + 1
                continue

            if _order_has_pii(order):
                stats["anonymized"] = int(stats["anonymized"]) + 1
                if not dry_run:
                    order.customer_phone = ANONYMIZED_ORDER_PHONE
                    order.customer_name = None
                    order.customer_address = None
                    order.note = None
                    order.reject_reason_text = None
                    db.add(order)

            to_delete_ids.append(order.id)

        if to_delete_ids:
            stats["deleted"] = int(stats["deleted"]) + len(to_delete_ids)
            if not dry_run:
                db.execute(delete(RestaurantOrderLine).where(RestaurantOrderLine.order_id.in_(to_delete_ids)))
                db.execute(delete(RestaurantOrder).where(RestaurantOrder.id.in_(to_delete_ids)))
                db.commit()

        if dry_run:
            break

    if not dry_run:
        db.commit()

    logger.info("order retention finished: %s", stats)
    return stats
