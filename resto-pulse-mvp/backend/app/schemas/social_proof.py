from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas.live_places import LivePlaceSearchItem


class DiscoverSearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=200)
    lat: float | None = None
    lng: float | None = None
    radius_km: float = Field(default=30.0, ge=1.0, le=30.0)
    city: str | None = None


class SocialProofSourceSummary(BaseModel):
    reddit: int = 0
    x: int = 0
    youtube: int = 0
    community: int = 0


class SocialProofVenueResult(BaseModel):
    place_id: str
    name: str
    n_total: int
    n_positive: int
    wilson: float
    badge: str
    final_score: float
    sources_summary: SocialProofSourceSummary


class SocialProofScanRequest(BaseModel):
    query: str = Field(min_length=2, max_length=200)
    city: str | None = None


class SocialProofStatus(BaseModel):
    status: str
    stale: bool = False
    can_scan: bool = False
    scan_label: str | None = None
    job_id: str | None = None
    poll_url: str | None = None
    progress_pct: int | None = None
    results: list[SocialProofVenueResult] = Field(default_factory=list)


class DiscoverSearchResponse(BaseModel):
    places: list[LivePlaceSearchItem]
    social: SocialProofStatus


class SocialProofJobResponse(BaseModel):
    job_id: str
    status: str
    progress_pct: int
    social: SocialProofStatus
