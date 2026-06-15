from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

AuthorNameDisplayMode = Literal["full", "masked", "nickname"]


class ReviewCreate(BaseModel):
    restaurant_id: str
    author_id: str | None = None
    author_email: str | None = None
    author_name: str | None = None
    author_avatar_url: str | None = None
    author_name_display: AuthorNameDisplayMode = "full"
    rating: int = Field(ge=1, le=5)
    review_text: str = Field(default="", max_length=5000)


class ReviewUpdate(BaseModel):
    author_id: str | None = None
    author_email: str | None = None
    rating: int | None = Field(default=None, ge=1, le=5)
    review_text: str | None = Field(default=None, max_length=5000)


class ReviewAuthorAction(BaseModel):
    author_id: str | None = None
    author_email: str | None = None


class ReviewReplyCreate(ReviewAuthorAction):
    reply_text: str = Field(min_length=1, max_length=2000)


class ReviewReplyUpdate(ReviewAuthorAction):
    reply_text: str = Field(min_length=1, max_length=2000)


class ReviewCategoryRead(BaseModel):
    category: str
    score: float | None = None
    label: str | None = None
    reason: str | None = None
    model_config = ConfigDict(from_attributes=True)


class ReviewReplyRead(BaseModel):
    id: str
    review_id: str
    author_id: str | None = None
    author_email: str | None = None
    author_name: str | None = None
    author_avatar_url: str | None = None
    author_avatar_preset: str | None = None
    reply_text: str
    created_at: str | None = None
    updated_at: str | None = None
    model_config = ConfigDict(from_attributes=True)


class ReviewRemedyOfferSummary(BaseModel):
    id: str
    discount_percent: int
    code: str
    coupon_expires_at: str
    customer_deadline_at: str
    status: str
    offer_message: str | None = None
    model_config = ConfigDict(from_attributes=True)


class ReviewRead(ReviewCreate):
    id: str
    review_kind: str = "visit"
    restaurant_order_id: str | None = None
    publication_status: str | None = "published"
    remedy_offer: ReviewRemedyOfferSummary | None = None
    created_at: str | None = None
    updated_at: str | None = None
    image_urls: list[str] = []
    sentiment_label: str | None = None
    sentiment_score: float | None = None
    ai_summary: str | None = None
    is_demo: bool = False
    source_platform: str | None = None
    categories: list[ReviewCategoryRead] = []
    author_name: str | None = None
    author_avatar_url: str | None = None
    author_avatar_preset: str | None = None
    author_name_display: AuthorNameDisplayMode = "full"
    helpful_count: int = 0
    viewer_marked_helpful: bool = False
    viewer_can_edit: bool = False
    replies: list[ReviewReplyRead] = []
    model_config = ConfigDict(from_attributes=True)


class ReviewAnalyzeResponse(BaseModel):
    review_id: str
    sentiment_label: str
    sentiment_score: float
    summary: str
    categories: list[dict]


class ReviewTextModerateRequest(BaseModel):
    review_text: str = Field(default="", max_length=5000)


class ReviewTextModerateResponse(BaseModel):
    allowed: bool
    message: str | None = None
    highlights: list[str] = Field(default_factory=list)


class OrderReviewCreate(BaseModel):
    user_email: str = Field(min_length=3)
    lezzet: int = Field(ge=1, le=5)
    servis: int = Field(ge=1, le=5)
    kurye: int = Field(ge=1, le=5)
    review_text: str = Field(default="", max_length=5000)
    author_name_display: AuthorNameDisplayMode = "full"
