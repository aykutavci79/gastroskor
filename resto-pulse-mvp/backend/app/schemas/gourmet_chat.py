from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class GourmetChatTagItem(BaseModel):
    id: str
    label: str


class GourmetChatAuthor(BaseModel):
    nickname: str
    avatar_url: str | None = None
    avatar_preset: str | None = None


class GourmetChatRoomItem(BaseModel):
    slug: str
    title: str
    description: str
    emoji: str
    sort_order: int
    allow_restaurant_cards: bool
    question_count: int = 0


class GourmetChatRoomListResponse(BaseModel):
    city: str
    items: list[GourmetChatRoomItem]


class GourmetChatAnswerItem(BaseModel):
    id: str
    body: str
    author: GourmetChatAuthor
    created_at: datetime


class GourmetChatQuestionItem(BaseModel):
    id: str
    room_slug: str
    city: str
    tag: str
    body: str
    answer_count: int
    author: GourmetChatAuthor
    created_at: datetime
    preview_answers: list[GourmetChatAnswerItem] = Field(default_factory=list)


class GourmetChatQuestionListResponse(BaseModel):
    city: str
    room_slug: str
    items: list[GourmetChatQuestionItem]


class GourmetChatQuestionDetail(GourmetChatQuestionItem):
    answers: list[GourmetChatAnswerItem]


class GourmetChatQuestionCreate(BaseModel):
    user_email: str
    city: str
    tag: str = "genel"
    body: str = Field(min_length=8, max_length=500)


class GourmetChatAnswerCreate(BaseModel):
    user_email: str
    body: str = Field(min_length=2, max_length=1200)
