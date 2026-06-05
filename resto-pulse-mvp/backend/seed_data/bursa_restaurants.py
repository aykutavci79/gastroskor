"""
Bursa ornek restoran paketi — GastroSkor seed verisi.

google_place_id: Elle dogrulanmis veya Places API ile cozulmus kimlik.
google_place_query: API anahtari varsa otomatik cozum icin arama metni.
maps_short_url: goo.gl baglantisi (ChIJ / 0x... cikarimi).
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class SampleReview:
    rating: int
    review_text: str


@dataclass(frozen=True)
class GeoIndicationSeed:
    """Tescilli veya taninmis cografi isaret urunu."""

    product: str
    region: str | None = None
    registry_note: str = "Türk Patent ve Marka Kurumu — Coğrafi İşaretler Portalı"


@dataclass(frozen=True)
class BursaRestaurantSeed:
    name: str
    category: str
    district: str
    address: str
    latitude: float
    longitude: float
    google_place_query: str
    google_place_id: str | None = None
    maps_short_url: str | None = None
    google_avg_rating: float | None = None
    google_review_count: int | None = None
    geo_indications: list[GeoIndicationSeed] = field(default_factory=list)
    has_geographical_indication: bool = False
    gi_product_name: str | None = None
    sample_reviews: list[SampleReview] = field(default_factory=list)


BURSA_RESTAURANTS: list[BursaRestaurantSeed] = [
    BursaRestaurantSeed(
        name="Kebapçı İskender",
        category="İskender / Kebap",
        district="Osmangazi",
        address="Orhanbey, Atatürk Cd. No:60, 16010 Osmangazi/Bursa",
        latitude=40.1833214,
        longitude=29.0653209,
        google_place_query="Kebapçı İskender Atatürk Caddesi Bursa",
        google_place_id="ChIJ1Z-0aB50yhQRn8m5e5sC8l0",
        maps_short_url="https://maps.app.goo.gl/SeMnZCKAw7Nshef49",
        google_avg_rating=4.3,
        google_review_count=12500,
        geo_indications=[
            GeoIndicationSeed(product="Bursa Döner Kebabı", region="Bursa"),
        ],
        has_geographical_indication=True,
        gi_product_name="Bursa Döner Kebabı",
        sample_reviews=[
            SampleReview(
                5,
                "Tereyagi ve domates sosu dengesi mukemmeldi. Servis hizli, mekan tarihi dokusunu koruyor.",
            ),
            SampleReview(
                4,
                "Lezzet tartisilmaz ama ogle saatlerinde bekleme suresi uzuyor. Fiyat segmenti orta-ust.",
            ),
        ],
    ),
    BursaRestaurantSeed(
        name="Çiçek Izgara (Merkez)",
        category="Izgara / Köfte",
        district="Osmangazi",
        address="Nalbantoğlu Mah., Belediye Cad. No:15, 16150 Osmangazi/Bursa",
        latitude=40.1967893,
        longitude=29.0580123,
        google_place_query="Çiçek Izgara Belediye Caddesi 15 Bursa",
        google_avg_rating=4.4,
        google_review_count=8200,
        geo_indications=[GeoIndicationSeed(product="İnegöl Köfte", region="Bursa / İnegöl")],
        has_geographical_indication=True,
        gi_product_name="İnegöl Köfte",
        sample_reviews=[
            SampleReview(
                5,
                "Kofte baharatsiz ve sade; etin kalitesi belli oluyor. Piyaz ve pide ile cok doyurucu.",
            ),
            SampleReview(
                3,
                "Lezzet guclu ama masa temizligi aksami biraz zayifti. Servis nazikti.",
            ),
        ],
    ),
    BursaRestaurantSeed(
        name="Hacı Dayı Tophane",
        category="Kebap / Urfa Mutfağı",
        district="Osmangazi",
        address="Osmangazi Mah., Osmangazi Çıkmazı, Tophane Bahçe İçi No:25, 16040 Osmangazi/Bursa",
        latitude=40.18835,
        longitude=29.06875,
        google_place_query="Hacı Dayı Kebap Tophane Bursa",
        google_avg_rating=4.5,
        google_review_count=5400,
        sample_reviews=[
            SampleReview(
                5,
                "Tophane manzarasi esliginde lahmacun ve kebap harikaydi. Personel ilgili.",
            ),
            SampleReview(
                4,
                "Bursa kebabi guzel ama fiyatlar turist yogunluguna gore bir tik yuksek.",
            ),
        ],
    ),
    BursaRestaurantSeed(
        name="Uludağ Kebapçısı Cemal & Cemil Usta",
        category="Bursa Kebabı",
        district="Osmangazi",
        address="Uluyol, Şirin Sok. No:12, Eski Garaj, Osmangazi/Bursa",
        latitude=40.19852,
        longitude=29.05308,
        google_place_query="Uludağ Kebapçısı Cemal Cemil Usta Bursa",
        google_avg_rating=4.6,
        google_review_count=3100,
        geo_indications=[GeoIndicationSeed(product="Bursa Döner Kebabı", region="Bursa")],
        has_geographical_indication=True,
        gi_product_name="Bursa Döner Kebabı",
        sample_reviews=[
            SampleReview(
                5,
                "Sadece Bursa kebabi sunmaları odakli bir deneyim. Et yumuşak, meşe kokusu hissediliyor.",
            ),
            SampleReview(
                4,
                "Mekan kucuk ve sade; lezzet icin gidilir. Bekleme olabilir.",
            ),
        ],
    ),
    BursaRestaurantSeed(
        name="Tarihi Taş Fırın",
        category="Fırın / Bursa Lezzeti",
        district="Osmangazi",
        address="Akbıyık Çıkmazı, Osmangazi/Bursa",
        latitude=40.1846,
        longitude=29.0551,
        google_place_query="Tarihi Taş Fırın Akbıyık Bursa",
        google_avg_rating=4.7,
        google_review_count=4800,
        geo_indications=[
            GeoIndicationSeed(product="Kemalpaşa Tatlısı", region="Bursa / Kemalpaşa"),
            GeoIndicationSeed(product="Bursa Süt Helvası", region="Bursa"),
            GeoIndicationSeed(product="Bursa Tahinli Pide", region="Bursa"),
        ],
        has_geographical_indication=True,
        sample_reviews=[
            SampleReview(
                5,
                "Bursa simidi ve tahinli pide sicak ve taze. Sabah kahvaltisina birebir.",
            ),
            SampleReview(
                4,
                "Cantik da denedik, cok guzeldi. Kuyruk biraz uzun olabiliyor.",
            ),
        ],
    ),
    BursaRestaurantSeed(
        name="Pideli Köfteci Yılmaz Usta",
        category="Köfte / Pide",
        district="Nilüfer",
        address="Beşevler, Nilüfer/Bursa",
        latitude=40.2012,
        longitude=29.0495,
        google_place_query="Pideli Köfteci Yılmaz Usta Bursa",
        google_avg_rating=4.2,
        google_review_count=2100,
        geo_indications=[GeoIndicationSeed(product="Bursa Pideli Köfte", region="Bursa")],
        has_geographical_indication=True,
        gi_product_name="Bursa Pideli Köfte",
        sample_reviews=[
            SampleReview(
                5,
                "Pideli kofte sosu ve kofte sicakligi tam yerinde. Porsiyon doyurucu.",
            ),
            SampleReview(
                3,
                "Lezzet iyi fakat servis aksami yavas kaldi. Ortam gurultulu.",
            ),
        ],
    ),
    BursaRestaurantSeed(
        name="Cantıkçı Yusuf",
        category="Bursa Mutfağı",
        district="Yıldırım",
        address="Kozahan Çarşısı, Yıldırım/Bursa",
        latitude=40.1819,
        longitude=29.1274,
        google_place_query="Cantıkçı Yusuf Kozahan Bursa",
        google_avg_rating=4.5,
        google_review_count=1900,
        geo_indications=[GeoIndicationSeed(product="Bursa Cantığı", region="Bursa")],
        has_geographical_indication=True,
        gi_product_name="Bursa Cantığı",
        sample_reviews=[
            SampleReview(
                5,
                "Cantik taze ve citir; peynir dengesi guzel. Kozahan atmosferi ile birlesince keyifli.",
            ),
            SampleReview(
                4,
                "Tatli tarafi biraz agir gelebilir ama kalite tutarli.",
            ),
        ],
    ),
    BursaRestaurantSeed(
        name="Kebapçı Tamer",
        category="İskender / Kebap",
        district="Osmangazi",
        address="Altıparmak, Osmangazi/Bursa",
        latitude=40.1905,
        longitude=29.0598,
        google_place_query="Kebapçı Tamer Bursa",
        google_avg_rating=4.4,
        google_review_count=6700,
        geo_indications=[GeoIndicationSeed(product="Bursa Döner Kebabı", region="Bursa")],
        has_geographical_indication=True,
        gi_product_name="Bursa Döner Kebabı",
        sample_reviews=[
            SampleReview(
                5,
                "Iskender sosu ve yogurt orani dengeli. Garsonlar bilgili ve hizli.",
            ),
            SampleReview(
                4,
                "Kalabalik saatlerde masa bulmak zor; lezzet icin sabretmeye deger.",
            ),
        ],
    ),
]
