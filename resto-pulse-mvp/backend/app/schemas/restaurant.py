from pydantic import BaseModel, ConfigDict, Field

from app.schemas.geo_indication import GeoIndicationRead


class RestaurantCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    city: str | None = Field(default=None, max_length=120)
    district: str | None = Field(default=None, max_length=120)
    address: str | None = Field(default=None, max_length=500)
    latitude: float | None = None
    longitude: float | None = None
    category: str | None = Field(default=None, max_length=120)
    geo_indications: list[GeoIndicationRead] = Field(default_factory=list)
    has_geographical_indication: bool = False
    gi_product_name: str | None = Field(default=None, max_length=255)


class RestaurantMenuItemPublic(BaseModel):
    id: str
    name: str
    price_tl: float
    description: str | None = None
    category: str | None = None
    image_url: str | None = None
    voice_product_slug: str | None = None


class VoiceMenuMatchPublic(BaseModel):
    voice_product_slug: str
    label: str
    price_tl: float
    menu_item_id: str


class RestaurantPromoPublic(BaseModel):
    has_own_courier: bool = False
    direct_order_text: str | None = None
    direct_order_phone: str | None = None
    direct_order_whatsapp: str | None = None
    direct_order_url: str | None = None
    menu_image_url: str | None = None
    card_cover_image_url: str | None = None
    instagram_url: str | None = None


class RestaurantRead(RestaurantCreate):
    id: str
    google_place_id: str | None = None
    maps_directions_url: str | None = None
    maps_search_url: str | None = None  # geriye uyumluluk; maps_directions_url ile ayni
    promo: RestaurantPromoPublic | None = None
    is_premium_partner: bool = False
    menu: list[RestaurantMenuItemPublic] = Field(default_factory=list)
    menu_preview: list[RestaurantMenuItemPublic] = Field(default_factory=list)
    menu_item_count: int = 0
    online_orders_available: bool = False
    online_order_categories: list[str] = Field(default_factory=list)
    check_in_visitor_count: int = Field(ge=0, default=0)
    seo_noindex: bool = False
    model_config = ConfigDict(from_attributes=True)


class OnlineOrderCategoryOption(BaseModel):
    slug: str
    label: str


class OnlineOrderOpenListResponse(BaseModel):
    items: list["RestaurantListItem"]
    categories: list[OnlineOrderCategoryOption] = Field(default_factory=list)
    voice_search_token: str | None = None
    voice_product_slugs: list[str] = Field(default_factory=list)


class VoiceProductCatalogResponse(BaseModel):
    groups: list[dict]
    products: list[dict]


class RestaurantListItem(BaseModel):
    id: str
    name: str
    city: str | None = None
    district: str | None = None
    category: str | None = None
    avg_rating: float | None = None
    geo_indications: list[GeoIndicationRead] = Field(default_factory=list)
    has_geographical_indication: bool = False
    gi_product_name: str | None = None
    promo: RestaurantPromoPublic | None = None
    is_premium_partner: bool = False
    menu_preview: list[RestaurantMenuItemPublic] = Field(default_factory=list)
    menu_item_count: int = 0
    online_orders_available: bool = False
    online_order_categories: list[str] = Field(default_factory=list)
    card_emoji: str | None = None
    google_rating: float | None = None
    google_review_count: int | None = None
    latitude: float | None = None
    longitude: float | None = None
    maps_directions_url: str | None = None
    distance_meters: float | None = None
    google_photo_url: str | None = None
    check_in_visitor_count: int = Field(ge=0, default=0)
    gastro_score: float | None = None
    distance_score: float | None = None
    rating_score: float | None = None
    popularity_score: float | None = None
    voice_menu_matches: list[VoiceMenuMatchPublic] = Field(default_factory=list)
    voice_search_token: str | None = None
    seo_noindex: bool = False
    model_config = ConfigDict(from_attributes=True)


class RestaurantTrendingItem(RestaurantListItem):
    latitude: float | None = None
    longitude: float | None = None
    week_review_count: int = 0
    week_avg_rating: float | None = None
    distance_meters: float | None = None
    distance_km: float | None = None
    distance_origin: str = "city_center"
    is_fallback: bool = False
    source: str = "gastroskor"
    google_place_id: str | None = None
    google_user_ratings_total: int | None = None
    maps_directions_url: str | None = None


class CityTopResponse(BaseModel):
    city: str
    items: list[RestaurantTrendingItem] = Field(default_factory=list)
    cached: bool = True


class NewMemberRestaurantsResponse(BaseModel):
    items: list[RestaurantListItem] = Field(default_factory=list)

