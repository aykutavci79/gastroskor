from __future__ import annotations

from pydantic import BaseModel, Field, model_validator

from app.constants.order_reject_reasons import ORDER_REJECT_REASON_CODES


class OrderLineInput(BaseModel):
    menu_item_id: str
    quantity: int = Field(ge=1, le=99)


class RestaurantOrderCreate(BaseModel):
    user_email: str = Field(min_length=3)
    customer_phone: str = Field(min_length=10, max_length=32)
    customer_address: str = Field(min_length=10, max_length=500)
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
    customer_address: str | None = None
    order_day: str | None = None
    daily_no: int | None = None
    order_number: str | None = None
    note: str | None = None
    total_tl: float
    lines: list[RestaurantOrderLineRead] = Field(default_factory=list)
    created_at: str | None = None
    decided_at: str | None = None
    reject_reason_code: str | None = None
    reject_reason_label: str | None = None
    reject_reason_text: str | None = None
    reject_message: str | None = None


class OrderPhoneStatus(BaseModel):
    verified: bool = False
    phone_e164: str | None = None
    phone_masked: str | None = None
    verified_at: str | None = None


class OrderPhoneSendOtpRequest(BaseModel):
    user_email: str = Field(min_length=3)
    phone: str = Field(min_length=10, max_length=32)


class OrderPhoneVerifyOtpRequest(BaseModel):
    user_email: str = Field(min_length=3)
    phone: str = Field(min_length=10, max_length=32)
    code: str = Field(min_length=4, max_length=8)


class RestaurantOrderActiveResponse(BaseModel):
    online_orders_available: bool
    pending_order: RestaurantOrderRead | None = None
    recent_rejected_order: RestaurantOrderRead | None = None
    order_phone: OrderPhoneStatus | None = None


class RestaurantOrderDecision(BaseModel):
    user_email: str
    decision: str = Field(description="accepted | rejected")
    reject_reason_code: str | None = Field(default=None, max_length=40)
    reject_reason_text: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validate_reject_fields(self) -> RestaurantOrderDecision:
        if self.decision != "rejected":
            return self
        code = (self.reject_reason_code or "").strip()
        text = (self.reject_reason_text or "").strip()
        if not code and len(text) < 3:
            raise ValueError("Red icin bir sebep secin veya aciklama yazin (en az 3 karakter).")
        if code and code not in ORDER_REJECT_REASON_CODES:
            raise ValueError("Gecersiz red sebebi.")
        return self


class PanelOrderRejectReasonsResponse(BaseModel):
    items: list[dict[str, str]] = Field(default_factory=list)


class PanelOrderListResponse(BaseModel):
    items: list[RestaurantOrderRead] = Field(default_factory=list)
