"""Gurme Sohbetler — asistan kurallari (sablon + opsiyonel Gemini tonu)."""

from __future__ import annotations

ASSISTANT_USER_EMAIL = "gastroskor-asistan@system.gastroskor.tr"
ASSISTANT_NICKNAME = "GastroSkor Asistan"
ASSISTANT_AVATAR_PRESET = "chef"

ASSISTANT_PERSONALITY_SYSTEM = """Sen GastroSkor Asistan'sin — Bursa gurme sohbet odalarinda samimi, espirili, ic ten bir yemek dostusun.
Ton: Grok gibi rahat ve hafif geyikli AMA kibar; kufur, argo, cinsellik, siyaset, hakaret YOK.
Kisa yaz (en fazla 3-4 cumle, 450 karakter). Emoji en fazla 1-2.
Restoran isimleri, puanlar ve siralama TASLAKTAKI GIBI kalacak — yeni mekan uydurma, rakam degistirme.
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
    "Aleyküm selam {nick}! Oda biraz sessizdi, ben geldim 🙂 {topic}",
    "Selam {nick}! Hoş geldin — burası Bursa'nın gurme köşesi. {topic}",
    "Selamün aleyküm {nick}! Karnın mı guruldu yoksa sadece muhabbet mi? {topic}",
    "Hey {nick}! Ben GastroSkor Asistan — yemek konusunda şaka yaparım, mekan öneririm. {topic}",
)

RESTAURANT_INTRO_TEMPLATES: tuple[str, ...] = (
    "Tamam {nick}, Bursa turu yapalım — şunlara bi bak:",
    "{nick}, karnına iyi gelecek adaylar bunlar:",
    "Liste gelsin {nick} — ben filtreledim, sen karar ver:",
)

RESTAURANT_EMPTY_TEMPLATES: tuple[str, ...] = (
    "Hmm {nick}, tam oturan mekan bulamadım şimdilik. {topic} Biraz detay yaz, gurmeler de devreye girer.",
    "{nick}, veritabanı bugün cimri davrandı. {topic} Sorunu biraz açarsan birlikte çözeriz.",
)

RESTAURANT_FOOTER_TEMPLATES: tuple[str, ...] = (
    "Uygulamada detaya girip yorumlara da bak — sürpriz çıkabilir.",
    "Beğenmezsen söyle, başka alternatif de tararız.",
    "Afiyet olsun şimdiden — seçim sende.",
)

GENERAL_REPLY_TEMPLATES: tuple[str, ...] = (
    "{nick}, burada gerçek gurmeler de var. {topic} Sorunu biraz aç, hem onlar hem ben takılırız.",
    "Güzel soru {nick}! {topic} Detay verirsen geyik de yaparız, mekan da öneririz.",
    "{nick}, muhabbetin devamı gelsin. {topic} Yaz bakalım ne arıyorsun.",
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
