from __future__ import annotations

from pydantic import BaseModel, Field


class AccountDeletionPayload(BaseModel):
    confirmation: str = Field(..., min_length=1, max_length=32)
    refresh_token: str | None = Field(default=None, min_length=10)
