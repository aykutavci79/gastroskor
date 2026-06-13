from datetime import datetime

from pydantic import BaseModel, Field


class PlaceCatalogCityCount(BaseModel):
    city: str
    count: int


class PlaceCatalogQueryCount(BaseModel):
    query: str
    count: int


class LiveSearchSourceCount(BaseModel):
    source: str
    count: int


class LiveSearchQueryGroupCount(BaseModel):
    query: str
    count: int


class LiveSearchPerformanceStats(BaseModel):
    period_days: int
    total_live_searches: int
    tracked_searches: int = Field(description="Kaynak bilgisi olan arama sayisi (deploy sonrasi birikir)")
    file_cache_hits: int
    google_api_calls: int
    google_free_searches: int = Field(description="Google API cagrilmadan cevaplanan aramalar")
    file_cache_hit_rate_pct: float | None = None
    google_free_rate_pct: float | None = Field(
        default=None,
        description="Google'a gitmeden cevaplanan arama orani (cache + DB/katalog)",
    )
    by_source: list[LiveSearchSourceCount] = Field(default_factory=list)
    top_query_groups: list[LiveSearchQueryGroupCount] = Field(
        default_factory=list,
        description="Gercek arama sayisi (deploy sonrasi, gruplanmis sorgular)",
    )


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
    linked_restaurants: int = Field(
        description="Katalogdaki mekanlardan GastroSkor panelinde kayitli restoranla eslesen (Google place_id)"
    )
    by_city: list[PlaceCatalogCityCount]
    top_queries: list[PlaceCatalogQueryCount] = Field(
        description="Mekan bazli son arama sorgulari (gruplanmis)"
    )
    search_performance: LiveSearchPerformanceStats
    recent_places: list[PlaceCatalogRecentPlace]
