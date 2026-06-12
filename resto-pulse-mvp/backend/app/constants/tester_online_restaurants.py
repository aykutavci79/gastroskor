"""Tester online siparis — 5 deneme restorani tanimi."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class TesterMenuItem:
    voice_slug: str | None
    name: str
    price_tl: float
    category: str | None = None


@dataclass(frozen=True)
class TesterRestaurantSeed:
    key: str
    name: str
    category_label: str
    online_order_categories: tuple[str, ...]
    card_emoji: str
    district: str
    lat_offset: float
    lng_offset: float
    google_rating: float
    review_count: int
    menu: tuple[TesterMenuItem, ...]


# Bursa merkez ~ 40.1885, 29.0610
TESTER_RESTAURANTS: tuple[TesterRestaurantSeed, ...] = (
    TesterRestaurantSeed(
        key="deneme-1",
        name="Deneme 1 — Tatlı & Tuzlu",
        category_label="Tatlı & Tuzlu",
        online_order_categories=("tatli-tuzlu", "kahve"),
        card_emoji="🍰",
        district="Osmangazi",
        lat_offset=0.0,
        lng_offset=0.0,
        google_rating=4.3,
        review_count=128,
        menu=(
            TesterMenuItem("baklava", "Baklava", 120.0, "tatli"),
            TesterMenuItem("sutlac", "Sutlac", 85.0, "tatli"),
            TesterMenuItem("kunefe", "Kunefe", 145.0, "tatli"),
            TesterMenuItem("borek", "Borek", 75.0, "tuzlu"),
            TesterMenuItem("su", "Su", 15.0, "icecek"),
            TesterMenuItem("kola", "Kola", 45.0, "icecek"),
            TesterMenuItem("ayran", "Ayran", 30.0, "icecek"),
        ),
    ),
    TesterRestaurantSeed(
        key="deneme-2",
        name="Deneme 2 — Kebap & Fırın",
        category_label="Kebap & Fırın",
        online_order_categories=("kebap-izgara", "firin"),
        card_emoji="🥙",
        district="Nilufer",
        lat_offset=0.012,
        lng_offset=0.008,
        google_rating=4.5,
        review_count=210,
        menu=(
            TesterMenuItem("lahmacun", "Lahmacun", 95.0),
            TesterMenuItem("acili-lahmacun", "Acili Lahmacun", 110.0),
            TesterMenuItem("adana-kebap", "Adana Kebap", 280.0),
            TesterMenuItem("urfa-kebap", "Urfa Kebap", 270.0),
            TesterMenuItem("pide", "Pide", 150.0),
            TesterMenuItem("kiymali-pide", "Kiymali Pide", 175.0),
            TesterMenuItem("ayran", "Ayran", 30.0),
            TesterMenuItem("kola", "Kola", 45.0),
        ),
    ),
    TesterRestaurantSeed(
        key="deneme-3",
        name="Deneme 3 — Kebap & Fırın",
        category_label="Kebap & Fırın",
        online_order_categories=("kebap-izgara", "firin"),
        card_emoji="🔥",
        district="Yildirim",
        lat_offset=-0.01,
        lng_offset=0.014,
        google_rating=4.1,
        review_count=96,
        menu=(
            TesterMenuItem("cantik-kiymali", "Kiymali Cantik", 135.0),
            TesterMenuItem("cantik-kusbasili", "Kusbasili Cantik", 150.0),
            TesterMenuItem("iskender", "Iskender", 310.0),
            TesterMenuItem("lahmacun", "Lahmacun", 100.0),
            TesterMenuItem("doner-durum", "Doner Durum", 185.0),
            TesterMenuItem("su", "Su", 15.0),
            TesterMenuItem("ayran", "Ayran", 28.0),
        ),
    ),
    TesterRestaurantSeed(
        key="deneme-4",
        name="Deneme 4 — Ev Yemekleri",
        category_label="Ev Yemekleri",
        online_order_categories=("ev-yemekleri", "kahvalti"),
        card_emoji="🍲",
        district="Osmangazi",
        lat_offset=0.018,
        lng_offset=-0.011,
        google_rating=4.4,
        review_count=74,
        menu=(
            TesterMenuItem(None, "Ev Mantisi", 160.0),
            TesterMenuItem(None, "Kuru Fasulye", 140.0),
            TesterMenuItem(None, "Pilav", 55.0),
            TesterMenuItem(None, "Coban Salata", 70.0),
            TesterMenuItem("pide", "Pide", 130.0),
            TesterMenuItem("ayran", "Ayran", 25.0),
            TesterMenuItem("su", "Su", 12.0),
        ),
    ),
    TesterRestaurantSeed(
        key="deneme-5",
        name="Deneme 5 — Dünya Mutfağı",
        category_label="Dünya Mutfağı",
        online_order_categories=("burger", "ev-yemekleri"),
        card_emoji="🍔",
        district="Nilufer",
        lat_offset=-0.015,
        lng_offset=-0.009,
        google_rating=4.2,
        review_count=152,
        menu=(
            TesterMenuItem(None, "Burger Menü", 220.0),
            TesterMenuItem(None, "Tavuk Burger", 195.0),
            TesterMenuItem("doner-durum", "Doner Durum", 175.0),
            TesterMenuItem(None, "Patates Kızartması", 65.0),
            TesterMenuItem("kola", "Kola", 45.0),
            TesterMenuItem("su", "Su", 15.0),
        ),
    ),
)

TESTER_OWNER_EMAIL = "tester-restoranlar@gastroskor.local"
BURSA_LAT = 40.1885
BURSA_LNG = 29.0610
