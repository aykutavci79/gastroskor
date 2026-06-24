from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class WalletSummary(BaseModel):
    balance: int
    today_earned: int
    today_cap_remaining: int
    hint_cost: int
    free_hints_per_game: int
    follow_today_count: int = 0
    follow_bundle_threshold: int = 3
    follow_bundle_granted_today: bool = False
    daily_login_granted_today: bool = False
    review_earn_today: int = 0
    review_daily_limit: int = 1
    order_earn_today: int = 0
    order_daily_limit: int = 2
    referral_earn_today: int = 0
    referral_daily_limit: int = 5


class JetonLedgerItem(BaseModel):
    id: str
    source: str
    source_id: str | None
    amount: int
    status: str
    created_at: datetime


class JetonLedgerListResponse(BaseModel):
    items: list[JetonLedgerItem]
    total: int


class GameHintSpendPayload(BaseModel):
    user_email: str = Field(min_length=3)
    game: str = Field(pattern="^(kelime_sofrasi|mini_sudoku)$")
    puzzle_id: str = Field(min_length=4, max_length=64)
    hint_index: int = Field(ge=0, le=20)


class GameHintSpendResponse(BaseModel):
    ok: bool
    balance: int
    charged: int
    reason: str | None = None


class GamePlaySpendPayload(BaseModel):
    user_email: str = Field(min_length=3)
    game: str = Field(pattern="^kelime_bul$")
    puzzle_id: str = Field(min_length=8, max_length=64)
    paid_only: bool = False


class GamePlaySpendResponse(BaseModel):
    ok: bool
    balance: int
    charged: int
    plays_today: int = 0
    free_remaining: int = 0
    reason: str | None = None


class DailyLoginClaimPayload(BaseModel):
    user_email: str = Field(min_length=3)


class DailyLoginClaimResponse(BaseModel):
    ok: bool
    balance: int
    amount: int
    reason: str | None = None


class ReferralClickPayload(BaseModel):
    referrer_id: UUID
    device_hash: str = Field(min_length=8, max_length=128)


class ArchiveDayUnlockPayload(BaseModel):
    user_email: str = Field(min_length=3)
    game: str = Field(
        pattern="^(kelime_sofrasi|gunluk_kelime|mini_sudoku|kelime_yarismasi)$"
    )
    gun_id: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")


class ArchiveDayUnlockResponse(BaseModel):
    ok: bool
    balance: int
    charged: int
    already_unlocked: bool = False
    reason: str | None = None


class ArchiveUnlockListResponse(BaseModel):
    game: str
    gun_ids: list[str]
    costs: dict[str, int]
