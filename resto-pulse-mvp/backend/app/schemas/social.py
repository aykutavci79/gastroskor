from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class PublicUserCard(BaseModel):
    id: str
    nickname: str
    avatar_url: str | None = None
    avatar_preset: str | None = None
    gastro_score: float | None = None
    review_count: int = Field(ge=0, default=0)
    is_friend: bool = False
    friend_request_status: str | None = None
    friend_request_id: str | None = None
    cooldown_until: datetime | None = None


class FriendListItem(PublicUserCard):
    friendship_id: str
    friends_since: datetime


class FriendListResponse(BaseModel):
    items: list[FriendListItem]
    total: int


class FriendAddPayload(BaseModel):
    user_email: str
    target_nickname: str


class FriendRequestItem(BaseModel):
    id: str
    direction: str
    status: str
    created_at: datetime
    responded_at: datetime | None = None
    cooldown_until: datetime | None = None
    peer: PublicUserCard


class FriendRequestListResponse(BaseModel):
    incoming: list[FriendRequestItem]
    outgoing: list[FriendRequestItem]
    total_pending: int


class FriendRequestActionPayload(BaseModel):
    user_email: str


class EglenceFriendActivityPayload(BaseModel):
    user_email: str
    game: Literal["mini_sudoku", "kelime_yarismasi", "kelime_sofrasi"]
    elapsed_ms: int | None = Field(default=None, ge=0, le=3_600_000)
    score: int | None = Field(default=None, ge=0, le=500)
    puzzle_id: str | None = Field(default=None, max_length=32)


class EglenceFriendActivityResponse(BaseModel):
    ok: bool = True
    notified_count: int = Field(ge=0)


class EglenceLeaderboardEntry(BaseModel):
    rank: int = Field(ge=1)
    user: PublicUserCard
    elapsed_ms: int | None = Field(default=None, ge=0)
    score: int | None = Field(default=None, ge=0)
    is_me: bool = False


class EglenceLeaderboardResponse(BaseModel):
    game: Literal["mini_sudoku", "kelime_yarismasi", "kelime_sofrasi"]
    period_key: str
    items: list[EglenceLeaderboardEntry]


class FriendRemovePayload(BaseModel):
    user_email: str
    target_nickname: str


class DmThreadSummary(BaseModel):
    id: str
    peer: PublicUserCard
    last_message: str | None = None
    last_message_at: datetime | None = None
    unread_count: int = Field(ge=0, default=0)


class DmInboxResponse(BaseModel):
    items: list[DmThreadSummary]
    total: int
    unread_total: int = Field(ge=0, default=0)


class DmMessageItem(BaseModel):
    id: str
    body: str
    sender_id: str
    is_own: bool
    created_at: datetime


class DmMessageListResponse(BaseModel):
    thread_id: str
    peer: PublicUserCard
    items: list[DmMessageItem]


class DmStartPayload(BaseModel):
    user_email: str
    target_nickname: str


class DmSendPayload(BaseModel):
    user_email: str
    body: str = Field(min_length=1, max_length=800)
