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


class RestaurantRead(RestaurantCreate):
    id: str
    google_place_id: str | None = None
    maps_directions_url: str | None = None
    maps_search_url: str | None = None  # geriye uyumluluk; maps_directions_url ile ayni
    model_config = ConfigDict(from_attributes=True)


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
    model_config = ConfigDict(from_attributes=True)

