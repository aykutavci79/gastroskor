from datetime import datetime

from pydantic import BaseModel, Field


class PublicUserCard(BaseModel):
    id: str
    nickname: str
    avatar_url: str | None = None
    avatar_preset: str | None = None
    gastro_score: float | None = None
    review_count: int = Field(ge=0, default=0)
    is_friend: bool = False


class FriendListItem(PublicUserCard):
    friendship_id: str
    friends_since: datetime


class FriendListResponse(BaseModel):
    items: list[FriendListItem]
    total: int


class FriendAddPayload(BaseModel):
    user_email: str
    target_nickname: str


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
