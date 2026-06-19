"""Kelime Sofrası — deneme loglama ve aday kelime taraması."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.config import BASE_DIR, settings
from app.models.entities import SofraKelimeAday, SofraKelimeAdayStatus, SofraWheelAttempt
from app.services.sofra_kelime_text import sofra_kelime_buyuk, sofra_kelime_gecerli
from app.services.tdk_lookup import tdk_kelime_dogrula

logger = logging.getLogger(__name__)

MIN_ATTEMPT_LOG_LENGTH = 4


def _havuz_yollari() -> tuple[Path, ...]:
    paths: list[Path] = []
    if settings.sofra_havuz_json_path:
        paths.append(Path(settings.sofra_havuz_json_path))
    paths.extend(
        [
            BASE_DIR / "app" / "data" / "kelime_sofrasi_havuz.json",
            BASE_DIR.parent / "mobile" / "data" / "kelime-sofrasi" / "havuz.json",
        ]
    )
    return tuple(paths)


@lru_cache(maxsize=1)
def sofra_havuz_kelimeleri() -> frozenset[str]:
    for yol in _havuz_yollari():
        if not yol.is_file():
            continue
        with yol.open(encoding="utf-8") as fh:
            data = json.load(fh)
        kelimeler = {sofra_kelime_buyuk(str(item.get("kelime") or "")) for item in data}
        kelimeler.discard("")
        logger.info("Sofra havuz yuklendi: %s kelime (%s)", len(kelimeler), yol)
        return frozenset(kelimeler)
    logger.warning("Sofra havuz.json bulunamadi.")
    return frozenset()


def record_wheel_attempt(db: Session, raw_kelime: str) -> bool:
    kelime = sofra_kelime_buyuk(raw_kelime)
    if len(kelime) < MIN_ATTEMPT_LOG_LENGTH or not sofra_kelime_gecerli(kelime):
        return False

    now = datetime.now(timezone.utc)
    stmt = (
        insert(SofraWheelAttempt)
        .values(
            kelime=kelime,
            attempt_count=1,
            first_seen_at=now,
            last_seen_at=now,
        )
        .on_conflict_do_update(
            index_elements=[SofraWheelAttempt.kelime],
            set_={
                "attempt_count": SofraWheelAttempt.attempt_count + 1,
                "last_seen_at": now,
            },
        )
    )
    db.execute(stmt)
    return True


def scan_sofra_kelime_adaylari(db: Session) -> dict[str, int]:
    havuz = sofra_havuz_kelimeleri()
    min_count = max(1, settings.sofra_attempt_min_count)
    now = datetime.now(timezone.utc)

    rows = db.scalars(
        select(SofraWheelAttempt)
        .where(SofraWheelAttempt.attempt_count >= min_count)
        .order_by(SofraWheelAttempt.attempt_count.desc())
    ).all()

    scanned = 0
    inserted = 0
    skipped_havuz = 0
    skipped_tdk = 0

    for row in rows:
        kelime = sofra_kelime_buyuk(row.kelime)
        if kelime in havuz:
            skipped_havuz += 1
            continue
        scanned += 1
        tdk_ok, anlam = tdk_kelime_dogrula(kelime)
        if not tdk_ok:
            skipped_tdk += 1
            continue

        existing = db.get(SofraKelimeAday, kelime)
        if existing:
            if existing.status != SofraKelimeAdayStatus.pending:
                continue
            existing.attempt_count = row.attempt_count
            existing.tdk_valid = True
            existing.tdk_anlam_kisa = anlam
            existing.updated_at = now
        else:
            db.add(
                SofraKelimeAday(
                    kelime=kelime,
                    attempt_count=row.attempt_count,
                    tdk_valid=True,
                    tdk_anlam_kisa=anlam,
                    status=SofraKelimeAdayStatus.pending,
                    created_at=now,
                    updated_at=now,
                )
            )
        inserted += 1

    return {
        "scanned": scanned,
        "inserted_or_updated": inserted,
        "skipped_in_havuz": skipped_havuz,
        "skipped_not_in_tdk": skipped_tdk,
        "min_attempt_count": min_count,
    }


def list_pending_adaylar(db: Session, limit: int = 100) -> list[SofraKelimeAday]:
    return list(
        db.scalars(
            select(SofraKelimeAday)
            .where(SofraKelimeAday.status == SofraKelimeAdayStatus.pending)
            .order_by(SofraKelimeAday.attempt_count.desc(), SofraKelimeAday.kelime.asc())
            .limit(limit)
        ).all()
    )


def set_aday_status(
    db: Session,
    kelime: str,
    status: SofraKelimeAdayStatus,
) -> SofraKelimeAday | None:
    norm = sofra_kelime_buyuk(kelime)
    row = db.get(SofraKelimeAday, norm)
    if not row:
        return None
    row.status = status
    row.reviewed_at = datetime.now(timezone.utc)
    row.updated_at = row.reviewed_at
    return row
