from pydantic import BaseModel, ConfigDict, Field


class ReviewCreate(BaseModel):
    restaurant_id: str
    author_id: str | None = None
    author_email: str | None = None
    author_name: str | None = None
    author_avatar_url: str | None = None
    rating: int = Field(ge=1, le=5)
    review_text: str = Field(default="", max_length=5000)


class ReviewCategoryRead(BaseModel):
    category: str
    score: float | None = None
    label: str | None = None
    reason: str | None = None
    model_config = ConfigDict(from_attributes=True)


class ReviewRead(ReviewCreate):
    id: str
    created_at: str | None = None
    image_urls: list[str] = []
    sentiment_label: str | None = None
    sentiment_score: float | None = None
    ai_summary: str | None = None
    is_demo: bool = False
    source_platform: str | None = None
    categories: list[ReviewCategoryRead] = []
    author_name: str | None = None
    author_avatar_url: str | None = None
    model_config = ConfigDict(from_attributes=True)


class ReviewAnalyzeResponse(BaseModel):
    review_id: str
    sentiment_label: str
    sentiment_score: float
    summary: str
    categories: list[dict]

