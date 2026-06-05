from pydantic import BaseModel, Field


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
    live_search_query: str


class RegionalProductListResponse(BaseModel):
    city: str
    items: list[RegionalProductItem]
    registry_note: str = Field(
        default="Ürün listesi TÜRKPATENT Coğrafi İşaretler Portalı'ndan derlenmiştir."
    )


class RegionalProductDetailResponse(BaseModel):
    product: RegionalProductItem
    discovery_note: str = Field(
        default="Mekan listesi Google canlı aramasıdır; GastroSkor restoran onayı vermez."
    )
