from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.constants.jeton import (
    ISTANBUL_TZ,
    JETON_DAILY_EARN_CAP,
    JETON_FIRST_ORDER_BONUS,
    JETON_FOLLOW_BUNDLE_AMOUNT,
    JETON_FOLLOW_BUNDLE_THRESHOLD,
    JETON_FREE_HINTS_PER_GAME,
    JETON_HINT_COST,
    JETON_ORDER_AMOUNT,
    JETON_ORDER_DAILY_LIMIT,
    JETON_ORDER_MIN_TL,
    JETON_REFERRAL_AMOUNT,
    JETON_REFERRAL_DAILY_LIMIT,
    JETON_WELCOME_BONUS,
    REFERRAL_ATTRIBUTION_DAYS,
)
from app.models.entities import (
    JetonDailyEarnTotal,
    JetonFollowReward,
    JetonLedger,
    JetonLedgerSource,
    JetonLedgerStatus,
    Referral,
    ReferralAttribution,
    ReferralStatus,
    RestaurantOrder,
    RestaurantOrderStatus,
    User,
    Wallet,
)

logger = logging.getLogger(__name__)


@dataclass
class EarnResult:
    granted: bool
    amount: int = 0
    balance: int = 0
    reason: str | None = None


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def istanbul_today() -> date:
    return datetime.now(ZoneInfo(ISTANBUL_TZ)).date()


def _lock_wallet(db: Session, user_id: UUID) -> Wallet:
    wallet = db.scalar(select(Wallet).where(Wallet.user_id == user_id).with_for_update())
    if wallet:
        return wallet
    wallet = Wallet(user_id=user_id, balance=0, updated_at=_utcnow())
    db.add(wallet)
    db.flush()
    return wallet


def get_wallet_balance(db: Session, *, user_id: UUID) -> int:
    wallet = db.scalar(select(Wallet).where(Wallet.user_id == user_id))
    return int(wallet.balance) if wallet else 0


def ensure_welcome_bonus(db: Session, *, user_id: UUID) -> EarnResult:
    """İlk cüzdan açılışında tek seferlik hoş geldin jetonu."""
    key = f"welcome_bonus:{user_id}"
    entry = _post_ledger_entry(
        db,
        user_id=user_id,
        source=JetonLedgerSource.manual_adjustment,
        source_id="welcome",
        amount=JETON_WELCOME_BONUS,
        idempotency_key=key,
        count_toward_daily_cap=False,
    )
    balance = get_wallet_balance(db, user_id=user_id)
    if entry and entry.status == JetonLedgerStatus.posted:
        return EarnResult(granted=True, amount=JETON_WELCOME_BONUS, balance=balance)
    return EarnResult(granted=False, balance=balance, reason="already_granted")


def get_daily_earn_summary(db: Session, *, user_id: UUID) -> tuple[int, int]:
    today = istanbul_today()
    row = db.scalar(
        select(JetonDailyEarnTotal).where(
            JetonDailyEarnTotal.user_id == user_id,
            JetonDailyEarnTotal.earn_date == today,
        )
    )
    earned = int(row.total_earned) if row else 0
    return earned, max(0, JETON_DAILY_EARN_CAP - earned)


def _lock_daily_total(db: Session, *, user_id: UUID, earn_date: date) -> JetonDailyEarnTotal:
    row = db.scalar(
        select(JetonDailyEarnTotal)
        .where(
            JetonDailyEarnTotal.user_id == user_id,
            JetonDailyEarnTotal.earn_date == earn_date,
        )
        .with_for_update()
    )
    if row:
        return row
    row = JetonDailyEarnTotal(user_id=user_id, earn_date=earn_date, total_earned=0)
    db.add(row)
    db.flush()
    return row


def _apply_wallet_delta(wallet: Wallet, delta: int) -> None:
    wallet.balance = max(0, int(wallet.balance) + int(delta))
    wallet.updated_at = _utcnow()


def _post_ledger_entry(
    db: Session,
    *,
    user_id: UUID,
    source: JetonLedgerSource,
    source_id: str | None,
    amount: int,
    idempotency_key: str,
    status: JetonLedgerStatus = JetonLedgerStatus.posted,
    related_ledger_id: UUID | None = None,
    update_wallet: bool = True,
    count_toward_daily_cap: bool = True,
) -> JetonLedger | None:
    """Returns ledger row if written, None if duplicate idempotency."""
    existing = db.scalar(
        select(JetonLedger).where(JetonLedger.idempotency_key == idempotency_key)
    )
    if existing:
        return None

    earn_amount = max(0, amount) if amount > 0 else 0
    if amount > 0 and count_toward_daily_cap and status == JetonLedgerStatus.posted:
        daily = _lock_daily_total(db, user_id=user_id, earn_date=istanbul_today())
        if daily.total_earned + earn_amount > JETON_DAILY_EARN_CAP:
            rejected = JetonLedger(
                user_id=user_id,
                source=source,
                source_id=source_id,
                amount=earn_amount,
                status=JetonLedgerStatus.rejected,
                idempotency_key=idempotency_key,
            )
            db.add(rejected)
            db.flush()
            logger.info(
                "jeton daily cap rejected user=%s key=%s amount=%s",
                user_id,
                idempotency_key,
                earn_amount,
            )
            return rejected

    entry = JetonLedger(
        user_id=user_id,
        source=source,
        source_id=source_id,
        amount=amount,
        status=status,
        related_ledger_id=related_ledger_id,
        idempotency_key=idempotency_key,
    )
    db.add(entry)
    try:
        with db.begin_nested():
            db.flush()
    except IntegrityError:
        return None

    if update_wallet and status == JetonLedgerStatus.posted:
        wallet = _lock_wallet(db, user_id)
        _apply_wallet_delta(wallet, amount)
        if amount > 0 and count_toward_daily_cap:
            daily = _lock_daily_total(db, user_id=user_id, earn_date=istanbul_today())
            daily.total_earned = int(daily.total_earned) + earn_amount

    return entry


def list_ledger_entries(
    db: Session,
    *,
    user_id: UUID,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[JetonLedger], int]:
    safe_limit = max(1, min(limit, 50))
    safe_offset = max(0, offset)
    base = select(JetonLedger).where(JetonLedger.user_id == user_id)
    total = int(db.scalar(select(func.count(JetonLedger.id)).where(JetonLedger.user_id == user_id)) or 0)
    rows = db.scalars(
        base.order_by(JetonLedger.created_at.desc()).offset(safe_offset).limit(safe_limit)
    ).all()
    return list(rows), total


def count_daily_earn_by_source_prefix(
    db: Session,
    *,
    user_id: UUID,
    key_prefix: str,
    earn_date: date | None = None,
) -> int:
    day = earn_date or istanbul_today()
    start = datetime.combine(day, datetime.min.time()).replace(tzinfo=ZoneInfo(ISTANBUL_TZ))
    end = start + timedelta(days=1)
    return int(
        db.scalar(
            select(func.count(JetonLedger.id)).where(
                JetonLedger.user_id == user_id,
                JetonLedger.amount > 0,
                JetonLedger.status == JetonLedgerStatus.posted,
                JetonLedger.idempotency_key.like(f"{key_prefix}%"),
                JetonLedger.created_at >= start,
                JetonLedger.created_at < end,
            )
        )
        or 0
    )


def try_earn_order_accepted(db: Session, *, order: RestaurantOrder, user: User) -> EarnResult:
    if order.status != RestaurantOrderStatus.accepted:
        return EarnResult(granted=False, reason="order_not_accepted")
    if Decimal(str(order.total_tl)) < JETON_ORDER_MIN_TL:
        return EarnResult(granted=False, reason="order_below_minimum")

    today_orders = count_daily_earn_by_source_prefix(
        db, user_id=user.id, key_prefix="order_earn:"
    )
    if today_orders >= JETON_ORDER_DAILY_LIMIT:
        return EarnResult(granted=False, reason="order_daily_limit")

    amount = JETON_ORDER_AMOUNT
    bonus = 0
    if not user.first_order_bonus_claimed:
        bonus = JETON_FIRST_ORDER_BONUS
        user.first_order_bonus_claimed = True
        db.add(user)

    total = amount + bonus
    key = f"order_earn:{order.id}"
    entry = _post_ledger_entry(
        db,
        user_id=user.id,
        source=JetonLedgerSource.order,
        source_id=str(order.id),
        amount=total,
        idempotency_key=key,
    )
    if entry is None:
        balance = get_wallet_balance(db, user_id=user.id)
        return EarnResult(granted=False, amount=0, balance=balance, reason="already_rewarded")
    if entry.status == JetonLedgerStatus.rejected:
        return EarnResult(granted=False, reason="daily_cap")

    balance = get_wallet_balance(db, user_id=user.id)
    return EarnResult(granted=True, amount=total, balance=balance)


def try_earn_follow_bundle(db: Session, *, user_id: UUID, restaurant_id: UUID) -> EarnResult:
    existing = db.scalar(
        select(JetonFollowReward.id).where(
            JetonFollowReward.user_id == user_id,
            JetonFollowReward.restaurant_id == restaurant_id,
        )
    )
    if existing:
        balance = get_wallet_balance(db, user_id=user_id)
        return EarnResult(granted=False, balance=balance, reason="already_rewarded_restaurant")

    db.add(JetonFollowReward(user_id=user_id, restaurant_id=restaurant_id, rewarded_at=_utcnow()))
    db.flush()

    today = istanbul_today()
    start = datetime.combine(today, datetime.min.time()).replace(tzinfo=ZoneInfo(ISTANBUL_TZ))
    end = start + timedelta(days=1)
    today_count = int(
        db.scalar(
            select(func.count(JetonFollowReward.id)).where(
                JetonFollowReward.user_id == user_id,
                JetonFollowReward.rewarded_at >= start,
                JetonFollowReward.rewarded_at < end,
            )
        )
        or 0
    )
    if today_count < JETON_FOLLOW_BUNDLE_THRESHOLD:
        balance = get_wallet_balance(db, user_id=user_id)
        return EarnResult(granted=False, balance=balance, reason="bundle_not_ready")

    key = f"follow_daily_bundle:{user_id}:{today.isoformat()}"
    entry = _post_ledger_entry(
        db,
        user_id=user_id,
        source=JetonLedgerSource.follow,
        source_id=str(restaurant_id),
        amount=JETON_FOLLOW_BUNDLE_AMOUNT,
        idempotency_key=key,
    )
    balance = get_wallet_balance(db, user_id=user_id)
    if entry and entry.status == JetonLedgerStatus.posted:
        return EarnResult(granted=True, amount=JETON_FOLLOW_BUNDLE_AMOUNT, balance=balance)
    if entry and entry.status == JetonLedgerStatus.rejected:
        return EarnResult(granted=False, balance=balance, reason="daily_cap")
    return EarnResult(granted=False, balance=balance, reason="already_rewarded_bundle")


def record_referral_click(
    db: Session,
    *,
    referrer_id: UUID,
    device_hash: str,
) -> None:
    clean_hash = device_hash.strip()[:128]
    if not clean_hash:
        return
    expires = _utcnow() + timedelta(days=REFERRAL_ATTRIBUTION_DAYS)
    db.add(
        ReferralAttribution(
            referrer_id=referrer_id,
            device_hash=clean_hash,
            clicked_at=_utcnow(),
            expires_at=expires,
        )
    )
    db.flush()


def _resolve_referrer_for_signup(
    db: Session,
    *,
    referred_user: User,
    referrer_id: UUID | None,
    device_hash: str | None,
    ip_at_signup: str | None,
) -> UUID | None:
    if referrer_id and referrer_id != referred_user.id:
        referrer = db.get(User, referrer_id)
        if referrer:
            return referrer_id

    clean_hash = (device_hash or "").strip()[:128]
    if not clean_hash:
        return None
    now = _utcnow()
    row = db.scalar(
        select(ReferralAttribution)
        .where(
            ReferralAttribution.device_hash == clean_hash,
            ReferralAttribution.expires_at >= now,
        )
        .order_by(ReferralAttribution.clicked_at.desc())
    )
    if row and row.referrer_id != referred_user.id:
        return row.referrer_id
    return None


def try_process_referral_on_signup(
    db: Session,
    *,
    referred_user: User,
    referrer_id: UUID | None = None,
    device_hash: str | None = None,
    ip_at_signup: str | None = None,
) -> EarnResult:
    resolved_referrer = _resolve_referrer_for_signup(
        db,
        referred_user=referred_user,
        referrer_id=referrer_id,
        device_hash=device_hash,
        ip_at_signup=ip_at_signup,
    )
    if not resolved_referrer:
        return EarnResult(granted=False, reason="no_referrer")

    existing_referral = db.scalar(
        select(Referral).where(Referral.referred_id == referred_user.id)
    )
    if existing_referral:
        return EarnResult(granted=False, reason="already_referred")

    flagged = False
    if device_hash and resolved_referrer:
        same_device = db.scalar(
            select(Referral.id).where(
                Referral.referrer_id == resolved_referrer,
                Referral.device_hash == device_hash.strip()[:128],
            )
        )
        if same_device:
            flagged = True

    referral = Referral(
        referrer_id=resolved_referrer,
        referred_id=referred_user.id,
        device_hash=(device_hash or "").strip()[:128] or None,
        ip_at_signup=(ip_at_signup or "").strip()[:64] or None,
        status=ReferralStatus.flagged if flagged else ReferralStatus.pending,
    )
    db.add(referral)
    try:
        with db.begin_nested():
            db.flush()
    except IntegrityError:
        return EarnResult(granted=False, reason="referral_conflict")

    if flagged:
        return EarnResult(granted=False, reason="flagged")

    today_referrals = count_daily_earn_by_source_prefix(
        db, user_id=resolved_referrer, key_prefix="referral_earn:"
    )
    if today_referrals >= JETON_REFERRAL_DAILY_LIMIT:
        referral.status = ReferralStatus.rejected
        db.add(referral)
        db.flush()
        return EarnResult(granted=False, reason="referral_daily_limit")

    key = f"referral_earn:{referred_user.id}"
    entry = _post_ledger_entry(
        db,
        user_id=resolved_referrer,
        source=JetonLedgerSource.referral,
        source_id=str(referred_user.id),
        amount=JETON_REFERRAL_AMOUNT,
        idempotency_key=key,
    )
    if entry and entry.status == JetonLedgerStatus.posted:
        referral.status = ReferralStatus.rewarded
        referral.rewarded_at = _utcnow()
        db.add(referral)
        balance = get_wallet_balance(db, user_id=resolved_referrer)
        return EarnResult(granted=True, amount=JETON_REFERRAL_AMOUNT, balance=balance)

    if entry and entry.status == JetonLedgerStatus.rejected:
        referral.status = ReferralStatus.rejected
        db.add(referral)
        return EarnResult(granted=False, reason="daily_cap")

    balance = get_wallet_balance(db, user_id=resolved_referrer)
    return EarnResult(granted=False, balance=balance, reason="referral_not_rewarded")


def spend_game_hint(
    db: Session,
    *,
    user_id: UUID,
    game: str,
    puzzle_id: str,
    hint_index: int,
) -> EarnResult:
    if hint_index < JETON_FREE_HINTS_PER_GAME:
        balance = get_wallet_balance(db, user_id=user_id)
        return EarnResult(granted=True, amount=0, balance=balance, reason="free_hint")

    key = f"game_spend:{user_id}:{game}:{puzzle_id}:hint:{hint_index}"
    wallet = _lock_wallet(db, user_id)
    if wallet.balance < JETON_HINT_COST:
        return EarnResult(granted=False, balance=wallet.balance, reason="insufficient_balance")

    existing = db.scalar(select(JetonLedger).where(JetonLedger.idempotency_key == key))
    if existing:
        return EarnResult(granted=True, amount=0, balance=wallet.balance, reason="already_spent")

    entry = JetonLedger(
        user_id=user_id,
        source=JetonLedgerSource.game_spend,
        source_id=f"{game}:{puzzle_id}",
        amount=-JETON_HINT_COST,
        status=JetonLedgerStatus.posted,
        idempotency_key=key,
    )
    db.add(entry)
    try:
        with db.begin_nested():
            db.flush()
    except IntegrityError:
        wallet = _lock_wallet(db, user_id)
        return EarnResult(granted=True, amount=0, balance=wallet.balance, reason="already_spent")

    _apply_wallet_delta(wallet, -JETON_HINT_COST)
    return EarnResult(granted=True, amount=-JETON_HINT_COST, balance=wallet.balance)
