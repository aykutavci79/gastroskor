from __future__ import annotations

from pydantic import BaseModel, Field


class PanelAccessRead(BaseModel):
    has_ownership: bool
    can_access_panel: bool
    panel_tier: str | None = None
    verification_status: str | None = None
    subscription_status: str | None = None
    trial_days_left: int | None = None
    competitor_limit: int = 0
    can_write_actions: bool = False
    pricing_next: str | None = None
    ownership_id: str | None = None
    restaurant_id: str | None = None
    restaurant_name: str | None = None
    google_place_id: str | None = None
    pending_visit: bool = False


class ClaimStartRequest(BaseModel):
    user_email: str
    place_id: str
    city: str = "Bursa"


class ClaimStartResponse(BaseModel):
    ownership_id: str
    restaurant_id: str
    restaurant_name: str
    verification_status: str
    panel_tier: str
    phone_info: dict


class ClaimOtpVerifyRequest(BaseModel):
    user_email: str
    code: str = Field(min_length=4, max_length=8)


class TaxDocumentRequest(BaseModel):
    user_email: str
    note: str = Field(min_length=10, max_length=4000)


class CompetitorAddRequest(BaseModel):
    user_email: str
    place_id: str
    name: str


class AnalyticsEventCreate(BaseModel):
    event_type: str
    place_id: str | None = None
    restaurant_id: str | None = None
    metadata: dict | None = None


class AdminVisitCompleteRequest(BaseModel):
    admin_note: str | None = None


class AdminActivateSubscriptionRequest(BaseModel):
    months: int = Field(default=1, ge=1, le=12)
    use_intro_price: bool = True
    ai_analysis_interval_days: int = Field(default=33, ge=1, le=90)
    ai_analysis_plan: str = Field(default="standart", description="standart | haftalik | gunluk")


class AiPurchaseRequest(BaseModel):
    user_email: str
    sku: str = Field(description="extra_analysis | addon_weekly | addon_daily")


class AdminGrantPanelRequest(BaseModel):
    user_email: str
    place_id: str
    city: str = "Bursa"
    force_takeover: bool = False
    admin_note: str | None = None


class MenuItemCreateRequest(BaseModel):
    user_email: str
    name: str = Field(min_length=2, max_length=120)
    price_tl: float = Field(ge=0, le=99999)
    description: str | None = Field(default=None, max_length=500)
    category: str | None = Field(default=None, max_length=60)


class MenuItemUpdateRequest(BaseModel):
    user_email: str
    name: str | None = Field(default=None, min_length=2, max_length=120)
    price_tl: float | None = Field(default=None, ge=0, le=99999)
    description: str | None = Field(default=None, max_length=500)
    category: str | None = Field(default=None, max_length=60)
    is_active: bool | None = None
    sort_order: int | None = None


class RestaurantPromoSettingsUpdate(BaseModel):
    user_email: str
    has_own_courier: bool = False
    direct_order_text: str | None = Field(default=None, max_length=120)
    direct_order_phone: str | None = Field(default=None, max_length=32)
    direct_order_whatsapp: str | None = Field(default=None, max_length=32)
    direct_order_url: str | None = Field(default=None, max_length=500)
    menu_image_url: str | None = Field(default=None, max_length=1024)
    card_cover_image_url: str | None = Field(default=None, max_length=1024)
    instagram: str | None = Field(default=None, max_length=120)
    card_emoji: str | None = Field(default=None, max_length=16)
