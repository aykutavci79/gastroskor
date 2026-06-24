"""Kelime Sofrası — günlük bulmaca havuzu (Wordle tarzı, kullanıcı bazlı değil)."""

from __future__ import annotations

import copy
import json
import logging
import subprocess
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.config import BASE_DIR, settings
from app.models.entities import SofraBulmacaReviewStatus, SofraDailyPuzzle
from app.services.sofra_grid_runs import validate_sofra_crossword, validate_stored_grid

logger = logging.getLogger(__name__)

ISTANBUL = ZoneInfo("Europe/Istanbul")
DAILY_RESET_HOUR = 17
SOFRA_KELIME_MIN: dict[str, int] = {"kolay": 5, "orta": 6, "zor": 5}
SOFRA_KELIME_MAX: dict[str, int] = {"kolay": 5, "orta": 6, "zor": 6}
SOFRA_KELIME_HEDEF: dict[str, int] = SOFRA_KELIME_MAX
ZORLUKLAR = ("kolay", "orta", "zor")
SOFRA_TUR_SAYISI = 5
EXPECTED_SLOTS_PER_DAY = len(ZORLUKLAR) * SOFRA_TUR_SAYISI
FALLBACK_SCAN_DAYS = 14


def sofra_puzzle_key(gun_id: str, zorluk: str, tur: int = 0) -> str:
    base = f"{gun_id}:{zorluk}"
    return f"{base}:t{tur}" if tur > 0 else base


def active_sofra_gun_id(now: datetime | None = None) -> str:
    """Mobil schedule.ts ile uyumlu — 17:00 İstanbul öncesi önceki gün."""
    dt = now or datetime.now(ISTANBUL)
    if dt.hour < DAILY_RESET_HOUR:
        dt = dt - timedelta(days=1)
    return dt.date().isoformat()


def upcoming_sofra_gun_id(now: datetime | None = None) -> str:
    """Cron hedefi — bugün 17:00'de başlayacak periyot (İstanbul takvim günü)."""
    dt = now or datetime.now(ISTANBUL)
    return dt.date().isoformat()


def shift_gun_id(gun_id: str, delta_days: int) -> str:
    y, m, d = (int(x) for x in gun_id.split("-"))
    shifted = date(y, m, d) + timedelta(days=delta_days)
    return shifted.isoformat()


def validate_puzzle_payload(puzzle: dict[str, Any], zorluk: str) -> tuple[bool, str]:
    lo = SOFRA_KELIME_MIN.get(zorluk)
    hi = SOFRA_KELIME_MAX.get(zorluk)
    if lo is None or hi is None:
        return False, "invalid_zorluk"
    words = puzzle.get("words")
    if not isinstance(words, list):
        return False, "missing_words"
    if len(words) < lo or len(words) > hi:
        return False, f"word_count={len(words)} expected={lo}-{hi}"
    if any(str(w.get("id", "")).startswith("fb-") for w in words if isinstance(w, dict)):
        return False, "fallback_ids"
    wheel = puzzle.get("wheel")
    if not isinstance(wheel, list) or len(wheel) < 5:
        return False, "invalid_wheel"
    grid = puzzle.get("grid")
    if not isinstance(grid, list) or not grid:
        return False, "invalid_grid"
    for w in words:
        if not isinstance(w, dict):
            return False, "invalid_word_shape"
        kelime = str(w.get("kelime") or "").strip()
        if len(kelime) < 3:
            return False, "short_word"
    if _has_same_axis_substring(words):
        return False, "same_axis_substring"
    if _has_partial_word_pair(words):
        return False, "partial_word_pair"
    ok, reason = validate_sofra_crossword(words)
    if not ok:
        return False, reason
    ok, reason = validate_stored_grid(puzzle)
    if not ok:
        return False, reason
    return True, "ok"


def _has_partial_word_pair(words: list[Any]) -> bool:
    """Önek/sonek çiftleri — GEL ⊂ GELİN."""
    placed = [w for w in words if isinstance(w, dict)]
    for short in placed:
        s_kelime = str(short.get("kelime") or "").strip().upper()
        if len(s_kelime) < 3:
            continue
        for long in placed:
            if long is short:
                continue
            l_kelime = str(long.get("kelime") or "").strip().upper()
            if len(l_kelime) <= len(s_kelime):
                continue
            if l_kelime.startswith(s_kelime) or l_kelime.endswith(s_kelime):
                return True
    return False


def _has_same_axis_substring(words: list[Any]) -> bool:
    """Aynı satır/sütunda kısa kelime uzun kelimenin parçası mı? (ALE ⊂ ALET)

    Böyle çiftler oyunda spoiler yaratır: kısa kelime yazılınca uzun
    kelimenin hücreleri açılır. Bu yerleşimleri havuza almayız.
    """
    placed = [w for w in words if isinstance(w, dict)]
    for short in placed:
        s_kelime = str(short.get("kelime") or "")
        s_dir = short.get("direction")
        s_row = short.get("row")
        s_col = short.get("col")
        if s_dir not in ("h", "v") or not isinstance(s_row, int) or not isinstance(s_col, int):
            continue
        for long in placed:
            if long is short:
                continue
            l_kelime = str(long.get("kelime") or "")
            if len(s_kelime) >= len(l_kelime):
                continue
            if long.get("direction") != s_dir:
                continue
            l_row = long.get("row")
            l_col = long.get("col")
            if not isinstance(l_row, int) or not isinstance(l_col, int):
                continue
            if s_dir == "h":
                if s_row != l_row:
                    continue
                if l_col <= s_col and s_col + len(s_kelime) <= l_col + len(l_kelime):
                    return True
            else:
                if s_col != l_col:
                    continue
                if l_row <= s_row and s_row + len(s_kelime) <= l_row + len(l_kelime):
                    return True
    return False


def clone_puzzle_for_slot(source: dict[str, Any], puzzle_id: str, zorluk: str) -> dict[str, Any]:
    cloned = copy.deepcopy(source)
    cloned["id"] = puzzle_id
    cloned["zorluk"] = zorluk
    return cloned


def _capture_pool_alert(message: str, extra: dict[str, Any] | None = None) -> None:
    logger.critical("SOFRA_POOL_ALERT: %s | %s", message, extra or {})
    if not (settings.sentry_dsn or "").strip():
        return
    try:
        import sentry_sdk

        with sentry_sdk.push_scope() as scope:
            if extra:
                for key, value in extra.items():
                    scope.set_extra(key, value)
            scope.set_tag("component", "sofra_puzzle_pool")
            sentry_sdk.capture_message(message, level="error")
    except Exception:
        logger.exception("Sentry capture basarisiz")


def _mobile_root() -> Path:
    if settings.sofra_mobile_root:
        return Path(settings.sofra_mobile_root)
    return BASE_DIR.parent / "mobile"


def run_node_generator(gun_id: str) -> list[dict[str, Any]] | None:
    """Mobil TS generator — Railway'de node yoksa None döner."""
    mobile_root = _mobile_root()
    script = mobile_root / "scripts" / "generate-sofra-pool.ts"
    if not script.is_file():
        logger.warning("Sofra generator script bulunamadi: %s", script)
        return None
    try:
        result = subprocess.run(
            ["npx", "tsx", str(script), "--gun-id", gun_id],
            cwd=str(mobile_root),
            capture_output=True,
            text=True,
            timeout=900,
            check=False,
        )
        if result.returncode != 0:
            logger.error(
                "Sofra node generator basarisiz (rc=%s): %s",
                result.returncode,
                (result.stderr or result.stdout)[:800],
            )
            return None
        payload = json.loads(result.stdout)
        if not isinstance(payload, list):
            logger.error("Sofra node generator beklenmeyen cikti")
            return None
        return payload
    except subprocess.TimeoutExpired:
        logger.error("Sofra node generator zaman asimi (900s)")
        return None
    except Exception:
        logger.exception("Sofra node generator hatasi")
        return None


def count_pool_slots(db: Session, gun_id: str) -> int:
    return int(
        db.scalar(
            select(func.count())
            .select_from(SofraDailyPuzzle)
            .where(SofraDailyPuzzle.gun_id == gun_id)
        )
        or 0
    )


def check_pool_coverage(db: Session, gun_ids: list[str]) -> dict[str, Any]:
    gaps: list[dict[str, Any]] = []
    for gid in gun_ids:
        count = count_pool_slots(db, gid)
        if count < EXPECTED_SLOTS_PER_DAY:
            gaps.append(
                {
                    "gun_id": gid,
                    "count": count,
                    "expected": EXPECTED_SLOTS_PER_DAY,
                }
            )
    return {"ok": len(gaps) == 0, "gaps": gaps}


def audit_stale_pool(db: Session, max_gap_days: int = 2) -> dict[str, Any]:
    """Cron 2+ gün kaçırıldıysa aktif periyot için yeterli slot var mı."""
    now = datetime.now(ISTANBUL)
    active = active_sofra_gun_id(now)
    upcoming = upcoming_sofra_gun_id(now)
    targets = list(dict.fromkeys([active, upcoming]))
    coverage = check_pool_coverage(db, targets)
    if coverage["ok"]:
        return {"ok": True, "active_gun_id": active, "coverage": coverage}

    _capture_pool_alert(
        "Kelime Sofrasi bulmaca havuzunda eksik slot",
        {"active_gun_id": active, "gaps": coverage["gaps"], "max_gap_days": max_gap_days},
    )
    return {"ok": False, "active_gun_id": active, "coverage": coverage}


def get_puzzle_row(
    db: Session,
    gun_id: str,
    zorluk: str,
    tur: int,
) -> SofraDailyPuzzle | None:
    return db.scalar(
        select(SofraDailyPuzzle).where(
            SofraDailyPuzzle.gun_id == gun_id,
            SofraDailyPuzzle.zorluk == zorluk,
            SofraDailyPuzzle.tur == tur,
        )
    )


def upsert_puzzle_row(
    db: Session,
    *,
    gun_id: str,
    zorluk: str,
    tur: int,
    puzzle_id: str,
    puzzle_data: dict[str, Any],
    is_fallback: bool,
    source_gun_id: str | None,
    generation_ms: int | None,
    review_status: SofraBulmacaReviewStatus = SofraBulmacaReviewStatus.approved,
) -> SofraDailyPuzzle:
    """Idempotent upsert — ayni (gun_id, zorluk, tur) ustune yazar."""
    now = datetime.now(timezone.utc)
    existing = get_puzzle_row(db, gun_id, zorluk, tur)
    if existing and existing.review_status == SofraBulmacaReviewStatus.flagged:
        review_status = SofraBulmacaReviewStatus.flagged

    stmt = (
        insert(SofraDailyPuzzle)
        .values(
            gun_id=gun_id,
            zorluk=zorluk,
            tur=tur,
            puzzle_id=puzzle_id,
            puzzle_data=puzzle_data,
            is_fallback=is_fallback,
            source_gun_id=source_gun_id,
            generation_ms=generation_ms,
            review_status=review_status,
            reviewed_at=now if review_status == SofraBulmacaReviewStatus.approved else None,
            created_at=now,
            updated_at=now,
        )
        .on_conflict_do_update(
            index_elements=["gun_id", "zorluk", "tur"],
            set_={
                "puzzle_id": puzzle_id,
                "puzzle_data": puzzle_data,
                "is_fallback": is_fallback,
                "source_gun_id": source_gun_id,
                "generation_ms": generation_ms,
                "review_status": review_status,
                "reviewed_at": now if review_status == SofraBulmacaReviewStatus.approved else None,
                "updated_at": now,
            },
        )
        .returning(SofraDailyPuzzle)
    )
    row = db.scalar(stmt)
    if row is None:
        raise RuntimeError("sofra_daily_puzzles upsert failed")
    return row


def _slot_from_generated(
    generated: list[dict[str, Any]],
    gun_id: str,
    zorluk: str,
    tur: int,
) -> dict[str, Any] | None:
    for item in generated:
        if (
            item.get("gun_id") == gun_id
            and item.get("zorluk") == zorluk
            and int(item.get("tur", -1)) == tur
            and item.get("ok") is True
            and isinstance(item.get("puzzle"), dict)
        ):
            return item
    return None


def generate_daily_puzzles(
    db: Session,
    gun_id: str | None = None,
    pregenerated: list[dict[str, Any]] | None = None,
    *,
    cron_mode: bool = False,
) -> dict[str, Any]:
    """Her zorluk × tur için bulmaca üret; başarısız slotta önceki günün yedeği."""
    if gun_id:
        target_gun = gun_id
    elif cron_mode or pregenerated is not None:
        target_gun = upcoming_sofra_gun_id()
    else:
        target_gun = active_sofra_gun_id()
    generated = pregenerated if pregenerated is not None else run_node_generator(target_gun)

    stats: dict[str, Any] = {
        "gun_id": target_gun,
        "generated": 0,
        "fallback": 0,
        "failed": 0,
        "skipped": 0,
        "node_used": pregenerated is None and generated is not None,
        "errors": [],
        "failed_slots": [],
    }

    for zorluk in ZORLUKLAR:
        for tur in range(SOFRA_TUR_SAYISI):
            puzzle_id = sofra_puzzle_key(target_gun, zorluk, tur)
            slot_item = _slot_from_generated(generated or [], target_gun, zorluk, tur)
            puzzle_data: dict[str, Any] | None = None
            generation_ms: int | None = None
            is_fallback = False
            source_gun_id: str | None = None

            if slot_item:
                candidate = slot_item["puzzle"]
                ok, reason = validate_puzzle_payload(candidate, zorluk)
                if ok and str(candidate.get("id", "")) == puzzle_id:
                    puzzle_data = candidate
                    generation_ms = slot_item.get("generation_ms")
                    stats["generated"] += 1
                else:
                    stats["errors"].append(f"{puzzle_id}: invalid_generated ({reason})")

            if puzzle_data is None:
                fb = _find_fallback_source(db, target_gun, zorluk, tur)
                if fb:
                    prev_row, source_gun_id = fb
                    puzzle_data = clone_puzzle_for_slot(prev_row.puzzle_data, puzzle_id, zorluk)
                    is_fallback = True
                    stats["fallback"] += 1
                else:
                    stats["failed"] += 1
                    stats["failed_slots"].append({"zorluk": zorluk, "tur": tur, "puzzle_id": puzzle_id})
                    stats["errors"].append(f"{puzzle_id}: no_fallback_source")
                    continue

            upsert_puzzle_row(
                db,
                gun_id=target_gun,
                zorluk=zorluk,
                tur=tur,
                puzzle_id=puzzle_id,
                puzzle_data=puzzle_data,
                is_fallback=is_fallback,
                source_gun_id=source_gun_id,
                generation_ms=generation_ms,
                review_status=SofraBulmacaReviewStatus.approved,
            )

    coverage = check_pool_coverage(db, [target_gun])
    stats["coverage"] = coverage
    if stats["failed"] > 0:
        _capture_pool_alert(
            "Kelime Sofrasi uretiminde basarisiz slot",
            {"gun_id": target_gun, "failed": stats["failed"], "errors": stats["errors"][:5]},
        )
    elif not coverage["ok"]:
        _capture_pool_alert(
            "Kelime Sofrasi havuz import sonrasi eksik slot",
            {"gun_id": target_gun, "gaps": coverage["gaps"]},
        )

    return stats


def _find_fallback_source(
    db: Session,
    gun_id: str,
    zorluk: str,
    tur: int,
    *,
    max_days: int = FALLBACK_SCAN_DAYS,
) -> tuple[SofraDailyPuzzle, str] | None:
    """Onceki gunlerde gecerli bulmaca; yoksa havuzdaki en yeni gecerli slot."""
    for delta in range(1, max_days + 1):
        prev_gun = shift_gun_id(gun_id, -delta)
        prev = get_puzzle_row(db, prev_gun, zorluk, tur)
        if prev is None or not validate_puzzle_payload(prev.puzzle_data, zorluk)[0]:
            continue
        source_gun = prev.gun_id if prev.is_fallback else prev_gun
        return prev, source_gun

    latest = db.scalar(
        select(SofraDailyPuzzle)
        .where(
            SofraDailyPuzzle.zorluk == zorluk,
            SofraDailyPuzzle.tur == tur,
        )
        .order_by(SofraDailyPuzzle.gun_id.desc())
        .limit(1)
    )
    if latest is None or not validate_puzzle_payload(latest.puzzle_data, zorluk)[0]:
        return None
    source_gun = latest.gun_id if latest.is_fallback and latest.source_gun_id else latest.gun_id
    return latest, source_gun


def fetch_puzzle_for_client(
    db: Session,
    gun_id: str,
    zorluk: str,
    tur: int,
) -> SofraDailyPuzzle | None:
    row = get_puzzle_row(db, gun_id, zorluk, tur)
    if row is not None:
        ok, reason = validate_puzzle_payload(row.puzzle_data, zorluk)
        if ok:
            return row
        logger.warning(
            "Sofra gecersiz bulmaca atlandi (havuz yenileme gerekli): %s %s t%s — %s",
            gun_id,
            zorluk,
            tur,
            reason,
        )
        _capture_pool_alert(
            "Kelime Sofrasi havuzda gecersiz bulmaca",
            {"gun_id": gun_id, "zorluk": zorluk, "tur": tur, "reason": reason},
        )

    prev_gun = shift_gun_id(gun_id, -1)
    fallback = _find_fallback_source(db, gun_id, zorluk, tur)
    if fallback is None:
        pool_days = db.scalar(
            select(func.count(func.distinct(SofraDailyPuzzle.gun_id))).select_from(SofraDailyPuzzle)
        )
        _capture_pool_alert(
            "Kelime Sofrasi bulmaca bulunamadi — havuz bos veya gecersiz",
            {
                "requested_gun_id": gun_id,
                "zorluk": zorluk,
                "tur": tur,
                "distinct_gun_ids_in_pool": int(pool_days or 0),
            },
        )
        return None
    prev, source_gun_id = fallback
    puzzle_id = sofra_puzzle_key(gun_id, zorluk, tur)
    cloned = clone_puzzle_for_slot(prev.puzzle_data, puzzle_id, zorluk)
    ok, reason = validate_puzzle_payload(cloned, zorluk)
    if not ok:
        logger.error("Sofra yedek bulmaca da gecersiz: %s", reason)
        return None
    if prev_gun != gun_id and prev.gun_id != gun_id:
        logger.warning(
            "Sofra fallback: %s %s t%s icin %s gununden kopyalandi",
            gun_id,
            zorluk,
            tur,
            source_gun_id,
        )
    return upsert_puzzle_row(
        db,
        gun_id=gun_id,
        zorluk=zorluk,
        tur=tur,
        puzzle_id=puzzle_id,
        puzzle_data=cloned,
        is_fallback=True,
        source_gun_id=source_gun_id,
        generation_ms=None,
        review_status=SofraBulmacaReviewStatus.approved,
    )


def list_puzzles(
    db: Session,
    *,
    gun_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[SofraDailyPuzzle], int]:
    count_q = select(func.count()).select_from(SofraDailyPuzzle)
    list_q = select(SofraDailyPuzzle)
    if gun_id:
        count_q = count_q.where(SofraDailyPuzzle.gun_id == gun_id)
        list_q = list_q.where(SofraDailyPuzzle.gun_id == gun_id)
    total = db.scalar(count_q) or 0
    rows = db.scalars(
        list_q.order_by(SofraDailyPuzzle.gun_id.desc(), SofraDailyPuzzle.zorluk, SofraDailyPuzzle.tur)
        .limit(limit)
        .offset(offset)
    ).all()
    return list(rows), int(total)


def set_review_status(
    db: Session,
    gun_id: str,
    zorluk: str,
    tur: int,
    status: SofraBulmacaReviewStatus,
) -> SofraDailyPuzzle | None:
    row = get_puzzle_row(db, gun_id, zorluk, tur)
    if row is None:
        return None
    row.review_status = status
    row.reviewed_at = datetime.now(timezone.utc)
    row.updated_at = datetime.now(timezone.utc)
    return row
