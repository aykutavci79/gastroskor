from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.constants.jeton import JETON_FREE_HINTS_PER_GAME, JETON_HINT_COST
from app.db.session import get_db
from app.models.entities import User
from app.schemas.jeton import (
    GameHintSpendPayload,
    GameHintSpendResponse,
    JetonLedgerItem,
    JetonLedgerListResponse,
    ReferralClickPayload,
    WalletSummary,
)
from app.services.jeton_service import (
    ensure_welcome_bonus,
    get_daily_earn_summary,
    get_wallet_balance,
    list_ledger_entries,
    record_referral_click,
    spend_game_hint,
)
from app.services.request_identity import resolve_authenticated_email

router = APIRouter(prefix="/jeton", tags=["jeton"])


def _resolve_user(db: Session, email: str) -> User:
    verified_email = resolve_authenticated_email(claimed_email=email)
    user = db.scalar(select(User).where(User.email == verified_email))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kullanici bulunamadi.")
    return user


@router.get("/me/wallet", response_model=WalletSummary)
def get_my_wallet(
    user_email: str = Query(..., min_length=3),
    db: Session = Depends(get_db),
):
    user = _resolve_user(db, user_email)
    ensure_welcome_bonus(db, user_id=user.id)
    db.commit()
    today_earned, cap_remaining = get_daily_earn_summary(db, user_id=user.id)
    return WalletSummary(
        balance=get_wallet_balance(db, user_id=user.id),
        today_earned=today_earned,
        today_cap_remaining=cap_remaining,
        hint_cost=JETON_HINT_COST,
        free_hints_per_game=JETON_FREE_HINTS_PER_GAME,
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
