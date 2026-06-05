from pydantic import BaseModel, Field

from app.schemas.geo_indication import GeoIndicationRead
from app.schemas.restaurant import RestaurantListItem


class RegionalProductItem(BaseModel):
    slug: str
    name: str
    city: str
    region: str
    summary: str
    registry_source: str
    turkpatent_id: str
    registration_year: int
    indication_type: str
    product_group: str
    detail_url: str
    image_url: str | None = None
    restaurant_count: int = 0


class RegionalProductListResponse(BaseModel):
    city: str
    items: list[RegionalProductItem]
    registry_note: str = Field(
        default="Ürün listesi TÜRKPATENT Coğrafi İşaretler Portalı'ndan derlenmiştir."
    )


class RegionalProductRestaurantsResponse(BaseModel):
    product: RegionalProductItem
    min_rating: float
    applied_min_rating: float
    rating_relaxed: bool = False
    items: list[RestaurantListItem]
