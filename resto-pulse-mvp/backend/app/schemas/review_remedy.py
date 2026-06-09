from pydantic import BaseModel, ConfigDict, Field


class ReviewRemedyOfferCreate(BaseModel):
    user_email: str
    discount_percent: int = Field(ge=5, le=100)
    coupon_valid_days: int = Field(default=30, ge=1, le=180)
    offer_message: str | None = Field(default=None, max_length=500)


class ReviewRemedyOfferRead(BaseModel):
    id: str
    review_id: str
    restaurant_id: str
    discount_percent: int
    code: str
    coupon_expires_at: str
    offer_message: str | None = None
    status: str
    offered_at: str
    customer_deadline_at: str
    responded_at: str | None = None
    model_config = ConfigDict(from_attributes=True)


class ReviewRemedyPendingRead(BaseModel):
    review_id: str
    restaurant_id: str
    restaurant_name: str | None = None
    rating: int
    review_text: str
    publication_status: str
    remedy_restaurant_deadline_at: str | None = None
    offer: ReviewRemedyOfferRead | None = None
    accept_disclaimer: str
    reject_disclaimer: str


class ReviewRemedyRespondRequest(BaseModel):
    author_email: str


class ReviewRemedyRespondResponse(BaseModel):
    review_id: str
    publication_status: str
    message: str
    offer: ReviewRemedyOfferRead | None = None
