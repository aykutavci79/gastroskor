from datetime import datetime

from pydantic import BaseModel, Field


class PushTokenRegister(BaseModel):
    user_email: str
    expo_push_token: str = Field(min_length=10, max_length=255)
    platform: str | None = Field(default=None, max_length=20)


class UserNotificationRead(BaseModel):
    id: str
    notification_type: str
    title: str
    message: str
    read_at: datetime | None = None
    created_at: datetime
    metadata: dict = Field(default_factory=dict)


class UserNotificationListResponse(BaseModel):
    items: list[UserNotificationRead]
    unread_count: int


class PanelFollowerRead(BaseModel):
    user_id: str
    display_name: str | None = None
    email_masked: str
    followed_at: datetime
    has_active_coupon: bool = False
    coupon_code: str | None = None
    coupon_discount_percent: int | None = None


class PanelFollowerListResponse(BaseModel):
    items: list[PanelFollowerRead]
    total: int
