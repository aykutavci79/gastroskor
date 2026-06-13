from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

FoodcastReportReason = Literal["inappropriate", "spam", "wrong_place", "other"]


class FoodcastPhotoItem(BaseModel):
    id: str
    image_url: str
    dish_name: str
    caption: str | None = None
    restaurant_id: str
    restaurant_name: str
    author_label: str
    created_at: datetime


class FoodcastFeedResponse(BaseModel):
    city: str
    items: list[FoodcastPhotoItem] = Field(default_factory=list)
    total_visible: int = 0


class FoodcastPhotoCreateResponse(BaseModel):
    photo: FoodcastPhotoItem


class FoodcastReportCreate(BaseModel):
    reporter_email: str | None = None
    reason: FoodcastReportReason
    note: str | None = Field(default=None, max_length=500)


class FoodcastReportResult(BaseModel):
    ok: bool = True
    message: str = "Bildiriminiz alindi. Tesekkurler."
