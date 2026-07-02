from __future__ import annotations

from pydantic import BaseModel, Field, model_validator

from app.constants.order_reject_reasons import ORDER_REJECT_REASON_CODES


class OrderLineInput(BaseModel):
    menu_item_id: str
    quantity: int = Field(ge=1, le=99)


class OrderPaymentOption(BaseModel):
    code: str
    label: str


class RestaurantOrderCreate(BaseModel):
    user_email: str = Field(min_length=3)
    customer_phone: str = Field(min_length=10, max_length=32)
    customer_address: str | None = Field(default=None, min_length=10, max_length=500)
    delivery_street_node_id: int = Field(ge=1)
    delivery_door_number: str = Field(min_length=1, max_length=20)
    delivery_address_note: str | None = Field(default=None, max_length=120)
    device_lat: float | None = Field(default=None, ge=-90, le=90)
    device_lng: float | None = Field(default=None, ge=-180, le=180)
    customer_name: str | None = Field(default=None, max_length=120)
    note: str | None = Field(default=None, max_length=500)
    payment_method: str = Field(min_length=2, max_length=40)
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
    payment_method: str | None = None
    payment_method_label: str | None = None
    total_tl: float
    lines: list[RestaurantOrderLineRead] = Field(default_factory=list)
    created_at: str | None = None
    decided_at: str | None = None
    reject_reason_code: str | None = None
    reject_reason_label: str | None = None
    reject_reason_text: str | None = None
    reject_message: str | None = None
    has_review: bool = False
    can_review: bool = False
    review_id: str | None = None


class OrderPhoneStatus(BaseModel):
    verified: bool = False
    phone_e164: str | None = None
    phone_masked: str | None = None
    verified_at: str | None = None


class OrderPhoneSendOtpResponse(BaseModel):
    sent: bool = True
    auto_verified: bool = False
    phone_masked: str
    expires_in_minutes: int
    delivery_mode: str = "live"
    info_message: str | None = None
    order_phone: OrderPhoneStatus | None = None


class OrderPhoneSendOtpRequest(BaseModel):
    user_email: str = Field(min_length=3)
    phone: str = Field(min_length=10, max_length=32)


class OrderPhoneVerifyOtpRequest(BaseModel):
    user_email: str = Field(min_length=3)
    phone: str = Field(min_length=10, max_length=32)
    code: str = Field(min_length=4, max_length=8)


class RestaurantOrderActiveResponse(BaseModel):
    online_orders_available: bool
    online_orders_open_now: bool = False
    online_order_hours_label: str | None = None
    online_order_hours_range_label: str | None = None
    order_payment_options: list[OrderPaymentOption] = Field(default_factory=list)
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


class UserOrderListResponse(BaseModel):
    items: list[RestaurantOrderRead] = Field(default_factory=list)
    pending_count: int = 0
    total: int = 0
