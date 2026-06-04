from datetime import datetime

from pydantic import BaseModel, Field


class FollowerPromotionCreate(BaseModel):
    user_email: str
    title: str = Field(default="Takipçi indirimi", min_length=2, max_length=120)
    discount_percent: int = Field(ge=5, le=50)
    valid_days: int = Field(ge=1, le=90, default=14)
    max_coupons: int = Field(ge=1, le=500, default=100)


class FollowerPromotionRead(BaseModel):
    id: str
    restaurant_id: str
    title: str
    discount_percent: int
    valid_until: datetime
    max_coupons: int
    issued_count: int
    redeemed_count: int
    status: str
    created_at: datetime


class FollowerCouponRead(BaseModel):
    id: str
    promotion_id: str
    restaurant_id: str
    restaurant_name: str | None = None
    code: str
    discount_percent: int
    status: str
    expires_at: datetime
    redeemed_at: datetime | None = None
    title: str | None = None


class FollowerCouponRedeemRequest(BaseModel):
    user_email: str
    code: str = Field(min_length=4, max_length=32)


class FollowerCouponRedeemResponse(BaseModel):
    ok: bool
    message: str
    coupon: FollowerCouponRead | None = None
