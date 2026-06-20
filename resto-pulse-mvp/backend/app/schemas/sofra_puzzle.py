from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


EglenceZorluk = Literal["kolay", "orta", "zor"]


class SofraPuzzleSlotPayload(BaseModel):
    gun_id: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    zorluk: EglenceZorluk
    tur: int = Field(ge=0, le=4)
    puzzle_id: str
    puzzle: dict[str, Any]
    generation_ms: int | None = None
    is_fallback: bool = False
    source_gun_id: str | None = None


class SofraBulmacaImportPayload(BaseModel):
    """GitHub Actions / generate-sofra-pool.ts çıktısı."""

    gun_id: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    puzzles: list[dict[str, Any]] = Field(min_length=1)


class SofraBulmacaUretPayload(BaseModel):
    gun_id: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    puzzles: list[SofraPuzzleSlotPayload] | None = None


class SofraPuzzleResponse(BaseModel):
    puzzle_id: str
    gun_id: str
    zorluk: EglenceZorluk
    tur: int
    puzzle: dict[str, Any]
    is_fallback: bool
    source_gun_id: str | None = None
    review_status: str


class SofraPuzzleListItem(BaseModel):
    id: int
    gun_id: str
    zorluk: EglenceZorluk
    tur: int
    puzzle_id: str
    kelime_sayisi: int
    wheel: list[str]
    kelimeler: list[str]
    is_fallback: bool
    source_gun_id: str | None
    generation_ms: int | None
    review_status: str
    reviewed_at: datetime | None
    created_at: datetime


class SofraPuzzleListResponse(BaseModel):
    items: list[SofraPuzzleListItem]
    total: int
