from __future__ import annotations

from pydantic import BaseModel, Field


class AddressNodeRead(BaseModel):
    id: int
    name: str
    level: str
    parent_id: int | None = None
    latitude: float | None = None
    longitude: float | None = None


class AddressNodeListResponse(BaseModel):
    items: list[AddressNodeRead] = Field(default_factory=list)
    parent_id: int | None = None
    city: str = "Bursa"


class DeliveryAddressValidateRequest(BaseModel):
    street_node_id: int = Field(ge=1)
    door_number: str = Field(min_length=1, max_length=20)
    address_note: str | None = Field(default=None, max_length=120)
    device_lat: float | None = Field(default=None, ge=-90, le=90)
    device_lng: float | None = Field(default=None, ge=-180, le=180)


class DeliveryAddressValidateResponse(BaseModel):
    formatted_address: str
    latitude: float
    longitude: float
    street_node_id: int
    door_number: str
