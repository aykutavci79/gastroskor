from pydantic import BaseModel


class DiscoverReviewTickerItem(BaseModel):
    id: str
    restaurant_id: str
    restaurant_name: str
    rating: int
    review_text: str
    snippet: str
    author_label: str | None = None


class DiscoverReviewTickerResponse(BaseModel):
    city: str
    items: list[DiscoverReviewTickerItem]
