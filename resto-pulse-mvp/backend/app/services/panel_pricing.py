from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from app.core.config import settings

AiPurchaseSku = Literal["extra_analysis", "addon_weekly", "addon_daily"]


@dataclass(frozen=True)
class AiPricingOffer:
    sku: str
    title: str
    description: str
    price_tl: int
    billing: str  # one_time | monthly_addon
    interval_days: int | None = None
    plan_key: str | None = None


def build_pricing_catalog() -> list[AiPricingOffer]:
    return [
        AiPricingOffer(
            sku="extra_analysis",
            title="Ekstra AI analizi",
            description="33 gunluk sure dolmadan bir kez daha rakip analizi.",
            price_tl=settings.price_extra_ai_tl,
            billing="one_time",
        ),
        AiPricingOffer(
            sku="addon_weekly",
            title="Haftalik AI paketi",
            description="Aboneliginize ek: yaklasik 7 gunde bir otomatik hak.",
            price_tl=settings.price_addon_weekly_tl,
            billing="monthly_addon",
            interval_days=7,
            plan_key="haftalik",
        ),
        AiPricingOffer(
            sku="addon_daily",
            title="Gunluk AI paketi",
            description="Aboneliginize ek: her gun yeni analiz hakki.",
            price_tl=settings.price_addon_daily_tl,
            billing="monthly_addon",
            interval_days=1,
            plan_key="gunluk",
        ),
    ]


def offer_by_sku(sku: str) -> AiPricingOffer | None:
    for offer in build_pricing_catalog():
        if offer.sku == sku:
            return offer
    return None


def pricing_catalog_as_dict() -> dict:
    base_panel = {
        "intro_month_tl": settings.price_panel_intro_tl,
        "monthly_tl": settings.price_panel_monthly_tl,
        "trial_days": settings.trial_days,
        "standard_ai_interval_days": settings.default_ai_analysis_interval_days,
    }
    offers = [
        {
            "sku": o.sku,
            "title": o.title,
            "description": o.description,
            "price_tl": o.price_tl,
            "billing": o.billing,
            "interval_days": o.interval_days,
            "plan_key": o.plan_key,
        }
        for o in build_pricing_catalog()
    ]
    return {
        "base_panel": base_panel,
        "offers": offers,
        "payments_mock_enabled": settings.panel_payments_mock,
    }
