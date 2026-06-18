from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class WalletSummary(BaseModel):
    balance: int
    today_earned: int
    today_cap_remaining: int
    hint_cost: int
    free_hints_per_game: int


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


class ReferralClickPayload(BaseModel):
    referrer_id: UUID
    device_hash: str = Field(min_length=8, max_length=128)
