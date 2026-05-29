from __future__ import annotations

from fastapi import HTTPException, status

from app.models import RestaurantOwnership, RestaurantSubscription
from app.services.panel_pricing import offer_by_sku


def apply_ai_purchase(
    subscription: RestaurantSubscription,
    sku: str,
) -> dict:
    offer = offer_by_sku(sku)
    if offer is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Gecersiz urun kodu.")

    if sku == "extra_analysis":
        subscription.ai_extra_credits = (subscription.ai_extra_credits or 0) + 1
        return {
            "sku": sku,
            "applied": "extra_credit",
            "extra_credits": subscription.ai_extra_credits,
            "message": "1 ekstra AI analiz hakki eklendi.",
        }

    if sku == "addon_weekly":
        subscription.ai_analysis_interval_days = 7
        subscription.ai_analysis_plan = "haftalik"
        return {
            "sku": sku,
            "applied": "addon_plan",
            "interval_days": 7,
            "plan_key": "haftalik",
            "message": "Haftalik AI paketi aktif.",
        }

    if sku == "addon_daily":
        subscription.ai_analysis_interval_days = 1
        subscription.ai_analysis_plan = "gunluk"
        return {
            "sku": sku,
            "applied": "addon_plan",
            "interval_days": 1,
            "plan_key": "gunluk",
            "message": "Gunluk AI paketi aktif.",
        }

    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Desteklenmeyen urun.")
