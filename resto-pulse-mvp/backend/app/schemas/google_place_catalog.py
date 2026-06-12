from datetime import datetime

from pydantic import BaseModel, Field


class PlaceCatalogCityCount(BaseModel):
    city: str
    count: int


class PlaceCatalogQueryCount(BaseModel):
    query: str
    count: int


class PlaceCatalogRecentPlace(BaseModel):
    name: str
    city: str
    rating: float | None
    seen_count: int
    last_source_query: str | None
    last_seen_at: datetime


class PlaceCatalogStatsResponse(BaseModel):
    total_places: int = Field(description="Benzersiz Google place kaydi sayisi")
    total_seen_events: int = Field(description="Toplam gorulme/tekrar sayisi (seen_count toplami)")
    linked_restaurants: int = Field(description="Uye restoranla eslesmis kayit sayisi")
    by_city: list[PlaceCatalogCityCount]
    top_queries: list[PlaceCatalogQueryCount]
    recent_places: list[PlaceCatalogRecentPlace]
