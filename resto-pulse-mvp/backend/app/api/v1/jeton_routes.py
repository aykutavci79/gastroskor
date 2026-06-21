from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.constants.jeton import (
    JETON_FREE_HINTS_PER_GAME,
    JETON_HINT_COST,
    JETON_ORDER_DAILY_LIMIT,
    JETON_REFERRAL_DAILY_LIMIT,
    JETON_REVIEW_DAILY_LIMIT,
)
from app.db.session import get_db
from app.models.entities import User
from app.schemas.jeton import (
    DailyLoginClaimPayload,
    DailyLoginClaimResponse,
    GameHintSpendPayload,
    GameHintSpendResponse,
    JetonLedgerItem,
    JetonLedgerListResponse,
    ReferralClickPayload,
    WalletSummary,
)
from app.services.jeton_service import (
    claim_daily_login,
    ensure_welcome_bonus,
    get_daily_earn_summary,
    get_daily_login_granted_today,
    get_follow_daily_progress,
    get_hub_task_earn_counts,
    get_wallet_balance,
    list_ledger_entries,
    record_referral_click,
    spend_game_hint,
)
from app.services.active_user import resolve_active_user_by_email

router = APIRouter(prefix="/jeton", tags=["jeton"])


def _resolve_user(db: Session, email: str) -> User:
    return resolve_active_user_by_email(db, email)


@router.get("/me/wallet", response_model=WalletSummary)
def get_my_wallet(
    user_email: str = Query(..., min_length=3),
    db: Session = Depends(get_db),
):
    user = _resolve_user(db, user_email)
    ensure_welcome_bonus(db, user_id=user.id)
    db.commit()
    today_earned, cap_remaining = get_daily_earn_summary(db, user_id=user.id)
    follow_count, follow_threshold, follow_granted = get_follow_daily_progress(db, user_id=user.id)
    daily_login_granted = get_daily_login_granted_today(db, user_id=user.id)
    hub_counts = get_hub_task_earn_counts(db, user_id=user.id)
    return WalletSummary(
        balance=get_wallet_balance(db, user_id=user.id),
        today_earned=today_earned,
        today_cap_remaining=cap_remaining,
        hint_cost=JETON_HINT_COST,
        free_hints_per_game=JETON_FREE_HINTS_PER_GAME,
        follow_today_count=follow_count,
        follow_bundle_threshold=follow_threshold,
        follow_bundle_granted_today=follow_granted,
        daily_login_granted_today=daily_login_granted,
        review_earn_today=hub_counts["review_earn_today"],
        review_daily_limit=JETON_REVIEW_DAILY_LIMIT,
        order_earn_today=hub_counts["order_earn_today"],
        order_daily_limit=JETON_ORDER_DAILY_LIMIT,
        referral_earn_today=hub_counts["referral_earn_today"],
        referral_daily_limit=JETON_REFERRAL_DAILY_LIMIT,
    )


@router.get("/me/ledger", response_model=JetonLedgerListResponse)
def get_my_ledger(
    user_email: str = Query(..., min_length=3),
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    user = _resolve_user(db, user_email)
    rows, total = list_ledger_entries(db, user_id=user.id, limit=limit, offset=offset)
    return JetonLedgerListResponse(
        items=[
            JetonLedgerItem(
                id=str(row.id),
                source=row.source.value,
                source_id=row.source_id,
                amount=row.amount,
                status=row.status.value,
                created_at=row.created_at,
            )
            for row in rows
        ],
        total=total,
    )


@router.post("/me/claim/daily-login", response_model=DailyLoginClaimResponse)
def post_claim_daily_login(payload: DailyLoginClaimPayload, db: Session = Depends(get_db)):
    user = _resolve_user(db, payload.user_email)
    result = claim_daily_login(db, user_id=user.id)
    db.commit()
    if not result.granted and result.reason == "already_claimed":
        return DailyLoginClaimResponse(
            ok=False,
            balance=result.balance,
            amount=0,
            reason="already_claimed",
        )
    if not result.granted and result.reason == "daily_cap":
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "daily_jeton_cap",
                "message": "Günlük jeton tavanına ulaşıldı.",
                "balance": result.balance,
            },
        )
    return DailyLoginClaimResponse(
        ok=result.granted,
        balance=result.balance,
        amount=result.amount if result.granted else 0,
        reason=result.reason,
    )


@router.post("/me/spend/game-hint", response_model=GameHintSpendResponse)
def post_spend_game_hint(payload: GameHintSpendPayload, db: Session = Depends(get_db)):
    user = _resolve_user(db, payload.user_email)
    result = spend_game_hint(
        db,
        user_id=user.id,
        game=payload.game,
        puzzle_id=payload.puzzle_id,
        hint_index=payload.hint_index,
    )
    db.commit()
    if not result.granted and result.reason == "insufficient_balance":
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "code": "insufficient_jeton",
                "message": "Yeterli jeton yok.",
                "balance": result.balance,
                "hint_cost": JETON_HINT_COST,
            },
        )
    charged = abs(result.amount) if result.amount < 0 else 0
    return GameHintSpendResponse(
        ok=result.granted,
        balance=result.balance,
        charged=charged,
        reason=result.reason,
    )


@router.post("/referral/click")
def post_referral_click(payload: ReferralClickPayload, db: Session = Depends(get_db)):
    referrer = db.get(User, payload.referrer_id)
    if not referrer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Davet eden bulunamadi.")
    record_referral_click(
        db,
        referrer_id=payload.referrer_id,
        device_hash=payload.device_hash,
    )
    db.commit()
    return {"ok": True}
