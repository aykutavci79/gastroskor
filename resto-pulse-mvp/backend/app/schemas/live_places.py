from pydantic import BaseModel, ConfigDict, Field

from app.schemas.restaurant import RestaurantMenuItemPublic, RestaurantPromoPublic


class LivePlaceReview(BaseModel):
    author_name: str | None = None
    rating: int | None = None
    relative_time_description: str | None = None
    text: str | None = None
    profile_photo_url: str | None = None


class OpeningHours(BaseModel):
    open_now: bool | None = None
    weekday_text: list[str] | None = None


class PlaceAnalysis(BaseModel):
    summary: str
    overall_sentiment: str
    overall_score: float
    categories: list[dict]


class ParsedSearchIntent(BaseModel):
    raw_query: str
    query: str
    min_rating: float | None = None
    max_distance_m: float | None = None
    min_distance_m: float | None = None
    removed_tokens: list[str] = Field(default_factory=list)


class LivePlaceSearchItem(BaseModel):
    place_id: str
    name: str
    address: str | None = None
    rating: float | None = None
    user_ratings_total: int | None = None
    latitude: float | None = None
    longitude: float | None = None
    distance_meters: float | None = None
    distance_origin: str = Field(
        default="city_center",
        description="Mesafe referansi: user = kullanici konumu, city_center = sehir merkezi",
    )
    distance_score: float = 0.0
    rating_score: float = 0.0
    popularity_score: float = 0.0
    gastro_score: float = 0.0
    maps_directions_url: str | None = Field(default=None)
    restaurant_id: str | None = None
    is_premium_partner: bool = False
    promo: RestaurantPromoPublic | None = None
    menu_preview: list[RestaurantMenuItemPublic] = Field(default_factory=list)
    menu_item_count: int = 0
    card_emoji: str | None = None
    member_avg_rating: float | None = None
    google_photo_url: str | None = None


class LivePlaceSearchResponse(BaseModel):
    items: list[LivePlaceSearchItem]
    parsed: ParsedSearchIntent
    filters_applied: dict[str, str | float | None] = Field(default_factory=dict)


class MemberReview(BaseModel):
    id: str
    author_name: str | None = None
    author_avatar_url: str | None = None
    rating: int
    review_text: str
    sentiment_label: str | None = None
    sentiment_score: float | None = None
    model_config = ConfigDict(from_attributes=True)


class LivePlaceDetails(BaseModel):
    place_id: str
    restaurant_id: str | None = None
    name: str
    address: str | None = None
    rating: float | None = None
    user_ratings_total: int | None = None
    phone_number: str | None = None
    website: str | None = None
    opening_hours: OpeningHours | None = None
    reviews: list[LivePlaceReview] = []
    member_reviews: list[MemberReview] = []
    member_review_count: int = 0
    member_avg_rating: float | None = None
    maps_directions_url: str | None = Field(default=None)
    maps_search_url: str | None = Field(default=None)
    photo_urls: list[str] = Field(default_factory=list)
    analysis: PlaceAnalysis | None = None
