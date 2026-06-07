from __future__ import annotations

from pydantic import BaseModel, Field


class OrderLineInput(BaseModel):
    menu_item_id: str
    quantity: int = Field(ge=1, le=99)


class RestaurantOrderCreate(BaseModel):
    user_email: str = Field(min_length=3)
    customer_phone: str = Field(min_length=10, max_length=32)
    customer_name: str | None = Field(default=None, max_length=120)
    note: str | None = Field(default=None, max_length=500)
    lines: list[OrderLineInput] = Field(min_length=1, max_length=40)


class RestaurantOrderLineRead(BaseModel):
    id: str
    menu_item_id: str | None = None
    name: str
    price_tl: float
    quantity: int
    line_total_tl: float


class RestaurantOrderRead(BaseModel):
    id: str
    restaurant_id: str
    restaurant_name: str | None = None
    status: str
    customer_phone: str
    customer_name: str | None = None
    note: str | None = None
    total_tl: float
    lines: list[RestaurantOrderLineRead] = Field(default_factory=list)
    created_at: str | None = None
    decided_at: str | None = None


class RestaurantOrderActiveResponse(BaseModel):
    online_orders_available: bool
    pending_order: RestaurantOrderRead | None = None


class RestaurantOrderDecision(BaseModel):
    user_email: str
    decision: str = Field(description="accepted | rejected")


class PanelOrderListResponse(BaseModel):
    items: list[RestaurantOrderRead] = Field(default_factory=list)
