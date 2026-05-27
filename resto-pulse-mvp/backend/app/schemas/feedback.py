from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

FeedbackStatus = Literal["open", "in_review", "resolved", "rejected"]
FeedbackSeverity = Literal["low", "medium", "high"]
FeedbackSenderType = Literal["user", "restaurant"]


class PrivateFeedbackCreate(BaseModel):
    place_id: str = Field(min_length=5, max_length=255)
    restaurant_id: str | None = None
    category: str = Field(min_length=2, max_length=50)
    severity: FeedbackSeverity = "medium"
    visit_at: datetime | None = None
    message: str = Field(min_length=5, max_length=5000)

    author_id: str | None = None
    author_email: str | None = None
    author_name: str | None = None
    author_avatar_url: str | None = None


class PrivateFeedbackRead(BaseModel):
    id: str
    place_id: str
    restaurant_id: str | None
    author_id: str
    category: str
    severity: FeedbackSeverity
    visit_at: datetime | None
    message: str
    status: FeedbackStatus
    created_at: datetime
    updated_at: datetime


class FeedbackMessageCreate(BaseModel):
    sender_type: FeedbackSenderType
    message: str = Field(min_length=1, max_length=4000)
    attachments_json: dict | None = None
    actor_user_id: str | None = None
    actor_user_email: str | None = None
    actor_restaurant_id: str | None = None


class FeedbackMessageRead(BaseModel):
    id: str
    feedback_id: str
    sender_type: FeedbackSenderType
    message: str
    attachments_json: dict | None = None
    created_at: datetime


class PrivateFeedbackStatusUpdate(BaseModel):
    status: Literal["in_review", "resolved", "rejected"]
    actor_user_id: str | None = None
    actor_user_email: str | None = None
    actor_restaurant_id: str | None = None


class CompensationCouponCreate(BaseModel):
    discount_percent: Literal[10, 25, 50]
    expires_at: datetime
    actor_user_id: str | None = None
    actor_user_email: str | None = None
    actor_restaurant_id: str | None = None


class CompensationCouponRead(BaseModel):
    id: str
    feedback_id: str
    restaurant_id: str
    user_id: str
    discount_percent: int
    code: str
    expires_at: datetime
    status: str
    created_at: datetime


class CompensationIssueResponse(BaseModel):
    coupon: CompensationCouponRead
    feedback_status: FeedbackStatus
    notification_ready: bool = True
    notification_payload: dict


class PrivateFeedbackDetailRead(BaseModel):
    feedback: PrivateFeedbackRead
    messages: list[FeedbackMessageRead] = Field(default_factory=list)
    latest_coupon: CompensationCouponRead | None = None

