from __future__ import annotations

from pydantic import BaseModel, Field


class FloorPlanLayout(BaseModel):
    version: int = 1
    tables: list[dict] = Field(default_factory=list)
    pois: list[dict] = Field(default_factory=list)


class FloorPlanRead(BaseModel):
    restaurant_id: str
    background_url: str | None = None
    layout: FloorPlanLayout | dict | None = None
    published_at: str | None = None
    has_published: bool = False


class FloorPlanDraftUpdate(BaseModel):
    user_email: str
    layout: dict
    background_url: str | None = Field(default=None, max_length=1024)


class TableReservationCreate(BaseModel):
    user_email: str = Field(min_length=3)
    table_id: str = Field(min_length=1, max_length=64)
    party_size: int = Field(ge=1, le=500)
    reserved_at: str = Field(description="ISO-8601 datetime")
    note: str | None = Field(default=None, max_length=500)
    customer_phone: str = Field(min_length=10, max_length=32)
    customer_name: str = Field(min_length=2, max_length=120)


class TableReservationRead(BaseModel):
    id: str
    restaurant_id: str
    restaurant_name: str | None = None
    user_id: str
    table_id: str
    table_label: str
    zone: str
    zone_label: str
    party_size: int
    reserved_at: str
    note: str | None = None
    customer_phone: str
    customer_name: str | None = None
    status: str
    reject_reason_text: str | None = None
    created_at: str | None = None
    restaurant_decided_at: str | None = None
    customer_confirmed_at: str | None = None
    customer_confirm_expires_at: str | None = None


class TableReservationListResponse(BaseModel):
    items: list[TableReservationRead] = Field(default_factory=list)


class TableReservationDecision(BaseModel):
    user_email: str
    decision: str = Field(description="approved | rejected")
    reject_reason_text: str | None = Field(default=None, max_length=500)


class TableReservationConfirm(BaseModel):
    user_email: str


class RestaurantReservationActiveResponse(BaseModel):
    online_reservations_available: bool
    floor_plan: FloorPlanRead | None = None
    reserved_table_ids: list[str] = Field(default_factory=list)
    closed_table_ids: list[str] = Field(default_factory=list)
    max_online_party_size: int = 10
    contact_phone: str | None = None


class PanelReservationListResponse(BaseModel):
    items: list[TableReservationRead] = Field(default_factory=list)
