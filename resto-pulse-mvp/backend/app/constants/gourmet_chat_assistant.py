"""Gurme Sohbetler — asistan kurallari (sablon + opsiyonel Gemini tonu)."""

from __future__ import annotations

ASSISTANT_USER_EMAIL = "gastroskor-asistan@system.gastroskor.tr"
ASSISTANT_NICKNAME = "GastroSkor Asistan"
ASSISTANT_AVATAR_PRESET = "chef"

ASSISTANT_PERSONALITY_SYSTEM = """Sen GastroSkor Asistan'sin — Bursa gurme sohbet odalarinda samimi, espirili, ic ten bir yemek dostusun.
Ton: Grok gibi rahat ve hafif geyikli AMA kibar; kufur, argo, cinsellik, siyaset, hakaret YOK.
Kisa yaz (en fazla 4-5 cumle, 500 karakter). Emoji en fazla 1-2.
Mekan ismi ONERME — kullaniciyi uygulamadaki Canli Arama'ya (Kesfet sekmesi) yonlendir.
Taslaktaki arama ornekleri ve puan ipuclari (4.5 yildiz, 4 yildiz) AYNEN kalsin; yeni mekan uydurma.
Bot oldugunu gizleme ama insan gibi rol yapma."""

ROOM_TOPIC_PROMPT: dict[str, str] = {
    "kes-donerciler": "Döner mi dürüm mü, yoksa direkt kebap modu mu?",
    "ocakbasi-muhabbeti": "Ocakbaşı mı mangal mı — karar verelim mi?",
    "anne-eli-ev-yemegi": "Ev yemeği gibi sıcacık bir lokanta mı arıyorsun?",
    "gece-acikanlar": "Gece üçte karnın mı guruldu, yoksa sadece muhabbet mi?",
    "fiyat-performans-avcilari": "Cüzdan dostu ama lezzetli mi gelsin?",
    "gizli-kalmis-mekanlar": "Herkesin bilmediği ama iyi bir köşe mi keşfedelim?",
}

GREETING_REPLY_TEMPLATES: tuple[str, ...] = (
    "Aleykum selam {nick}! Oda biraz sessizdi, ben geldim 🙂 {topic}",
    "Selam {nick}! Hos geldin — burasi Bursa'nin gurme kosesi. {topic}",
    "Selamun aleykum {nick}! Karnin mi guruldu? Canli Arama'da yakina gore liste cikar — istersen soyle ne cektigini. {topic}",
    "Hey {nick}! Ben GastroSkor Asistan — sohbet ederiz, mekan icin seni Canli Arama'ya yonlendiririm. {topic}",
)

LIVE_SEARCH_ASK_CRAVING_TEMPLATES: tuple[str, ...] = (
    "{nick}, aciktigini anladim 🙂 Caninin cektigi ozel bir sey var mi — doner, ocakbasi, ev yemegi? Yazinca Canli Arama'da ne arayacagini soyleyecegim.",
    "Tamam {nick}! Once ne istedigini netlestirelim: {topic} Tek kelime bile yeter — sonra Kesfet'teki arama kutusuna ne yazacagini tarif ederim.",
    "{nick}, liste vermek yerine seni Canli Arama'ya yonlendireyim. Ne tur yemek ariyorsun?",
)

LIVE_SEARCH_GUIDE_TEMPLATES: tuple[str, ...] = (
    (
        "{nick}, tamam! Kesfet sekmesindeki Canli Arama'ya git ve su metni yaz: «{query}» "
        "(konum aciksa yakina gore, puana ve yoruma gore siralar). "
        "Az sonuc cikarsa «{relaxed_query}» dene. Gurmeler de fikir verir."
    ),
    (
        "{nick}, mekan ismi vermek yerine Canli Arama kullanalim — arama kutusuna: «{query}». "
        "4,5+ ile basla; yetmezse «{relaxed_query}». Konum izni verirsen mesafe de hesaplanir."
    ),
    (
        "Hadi {nick}! Ana sayfa → arama: «{query}». Google canli sonuclar; GastroSkor puaniyla sirali. "
        "Bos kalirsa puani 4'e dusur: «{relaxed_query}»."
    ),
)

GENERAL_REPLY_TEMPLATES: tuple[str, ...] = (
    "{nick}, burada gercek gurmeler de var. {topic} Mekan arayacaksan Kesfet'te Canli Arama'ya «4.5 yildiz» ekleyerek dene.",
    "Guzel soru {nick}! {topic} Yemek arayacaksan Canli Arama'da «{default_query}» yazip yakindakilere bakabilirsin.",
    "{nick}, muhabbetin devami gelsin. {topic} Aciktiysan Canli Arama ipucu ister misin?",
)

ROOM_DEFAULT_LIVE_QUERY: dict[str, str] = {
    "kes-donerciler": "doner 4.5 yildiz",
    "ocakbasi-muhabbeti": "ocakbasi 4.5 yildiz",
    "anne-eli-ev-yemegi": "ev yemegi 4.5 yildiz",
    "gece-acikanlar": "gece acik doner 4 yildiz",
    "fiyat-performans-avcilari": "lokanta 4 yildiz",
    "gizli-kalmis-mekanlar": "restoran 4.5 yildiz",
}

HUNGRY_KEYWORDS: tuple[str, ...] = (
    "aciktim",
    "acıktım",
    "aciktir",
    "acıktır",
    "cok aciktim",
    "çok açıktım",
    "karnim",
    "karnım",
    "ac karn",
    "acik karn",
    "aç karn",
)

ROOM_SEARCH_HINTS: dict[str, tuple[str, ...]] = {
    "kes-donerciler": ("doner", "döner", "durum", "dürüm", "kebap", "lahmacun", "adana"),
    "ocakbasi-muhabbeti": (
        "ocakbasi",
        "ocakbaşı",
        "ocak",
        "izgara",
        "ızgara",
        "mangal",
        "grill",
        "bbq",
        "kasap",
        "steak",
        "biftek",
        "kuzu",
        "et lokant",
    ),
    "anne-eli-ev-yemegi": ("ev yemegi", "ev yemeği", "lokanta", "sulu", "corba", "çorba", "gunluk", "günlük"),
    "gece-acikanlar": ("gece", "bufe", "büfe", "24", "acik", "açık"),
    "fiyat-performans-avcilari": ("lokanta", "doner", "döner", "pide"),
    "gizli-kalmis-mekanlar": ("lokanta", "restoran", "cafe", "kafe", "mahalle"),
}

# Oda baglamina aykiri mekanlari ele (isim/kategori icinde gecerse).
ROOM_EXCLUDE_HINTS: dict[str, tuple[str, ...]] = {
    "ocakbasi-muhabbeti": (
        "cig kofte",
        "ciğ köfte",
        "etsiz",
        "komagene",
        "burger",
        "pizza",
        "sushi",
        "doner",
        "döner",
        "kebap",
        "lahmacun",
        "pide",
        "tatli",
        "tatlı",
        "pastane",
        "cafe",
        "kafe",
    ),
    "kes-donerciler": ("cig kofte", "ciğ köfte", "komagene", "burger", "pizza", "sushi"),
    "anne-eli-ev-yemegi": ("burger", "pizza", "sushi", "fast food", "cig kofte", "ciğ köfte"),
}

# Kisa tercih cevaplari ("ocakbasi", "mangal") -> mekan onerisi niyeti.
ROOM_PREFERENCE_KEYWORDS: dict[str, tuple[str, ...]] = {
    "ocakbasi-muhabbeti": ("ocakbasi", "ocakbaşı", "mangal", "izgara", "ızgara", "kuzu"),
    "kes-donerciler": ("doner", "döner", "durum", "dürüm", "kebap", "lahmacun"),
    "anne-eli-ev-yemegi": ("ev yemegi", "ev yemeği", "sulu", "corba", "çorba", "lokanta"),
    "gece-acikanlar": ("gece", "bufe", "büfe", "doner", "döner"),
    "fiyat-performans-avcilari": ("ucuz", "uygun", "fiyat", "performans", "cigkofte", "çiğ köfte"),
    "gizli-kalmis-mekanlar": ("gizli", "az bilinen", "sakli", "saklı"),
}

GREETING_PHRASES: tuple[str, ...] = (
    "selam",
    "slm",
    "mrb",
    "mrbg",
    "merhaba",
    "gunaydin",
    "günaydın",
    "iyi aksamlar",
    "iyi akşamlar",
    "selamun aleykum",
    "selamun aleyküm",
    "aleykum selam",
    "aleyküm selam",
    "selam aleykum",
    "selam aleyküm",
    "hey",
    "sa",
    "as",
)

GREETING_TOKENS = frozenset(
    {
        "selam",
        "slm",
        "mrb",
        "mrbg",
        "merhaba",
        "gunaydin",
        "günaydın",
        "iyi",
        "aksamlar",
        "akşamlar",
        "selamun",
        "aleykum",
        "aleyküm",
        "selam",
        "hey",
        "sa",
        "as",
        "naber",
        "nbr",
    }
)

RESTAURANT_ASK_KEYWORDS: tuple[str, ...] = (
    "oner",
    "öner",
    "oneri",
    "öneri",
    "nere",
    "nerede",
    "neresi",
    "var mi",
    "var mı",
    "acik",
    "açık",
    "fiyat",
    "uygun",
    "mekan",
    "restoran",
    "yer",
    "doner",
    "döner",
    "kebap",
    "kahvalti",
    "kahvaltı",
    "tatli",
    "tatlı",
    "ocakbasi",
    "ocakbaşı",
    "gece",
    "yemek",
    "lokanta",
    "gidilir",
    "gidelim",
    "tavsiye",
)

THANKS_KEYWORDS: tuple[str, ...] = (
    "sagol",
    "sağol",
    "tesekkur",
    "teşekkür",
    "eyv",
    "eyvallah",
    "tesekkurler",
    "teşekkürler",
)
