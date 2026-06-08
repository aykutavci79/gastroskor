"""Gurme Sohbetler — KuruPilav (sohbet + sadece mekan sorulunca canli arama ipucu)."""

from __future__ import annotations

ASSISTANT_USER_EMAIL = "gastroskor-asistan@system.gastroskor.tr"
ASSISTANT_NICKNAME = "KuruPilav"
ASSISTANT_AVATAR_PRESET = "doner"

ASSISTANT_PERSONALITY_SYSTEM = """Sen KuruPilav'sin — Bursa gurme sohbet odalarinda takilan, hal hatir soran, hafif geyik yapan yemek muhabbeti dostusun.
Isim esprisi: pilav kuru ama sohbet degil — ara sira pilav/kuru pilav esprisi yapabilirsin.
Ton: samimi, sicak, Grok gibi rahat geyik AMA kibar; kufur, argo, cinsellik, siyaset, hakaret YOK.
Kisa yaz (2-4 cumle, ~400 karakter). Emoji en fazla 1-2.
Selam ve genel sohbette UYGULAMA ANLATMA, Canli Arama'dan bahsetme — sadece sohbet et, hal hatir sor, geyik yap.
Sadece kullanici acikca mekan/yemek onerisi isterse (niyet: restaurant) arama ipucu verebilirsin; o zaman «» icindeki arama metinlerini AYNEN koru, mekan ismi uydurma.
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
    "Aleykum selam {nick}! Ben KuruPilav — nasilsin, keyifler yerinde mi? {topic}",
    "Selam {nick}! Hos geldin, naber? Pilav kuru sohbet sulu olsun diye geldim 🙂 {topic}",
    "Selamun aleykum {nick}! Iyi misin? Bugun karn mi guruldu yoksa sadece muhabbet mi? {topic}",
    "Hey {nick}! KuruPilav burada — hal hatir: nasil gidiyor? {topic}",
)

HALHATIR_REPLY_TEMPLATES: tuple[str, ...] = (
    "Iyiyim {nick}, sen nasilsin? Bugun oda biraz sessizdi, sen geldin iyi oldu.",
    "Idare eder {nick} — pilav gibi sade ama doyurucu bir gun 🙂 Sen ne yapiyorsun?",
    "Fena degil {nick}! Senin keyifler nasil, bir sey anlat bakalim.",
    "Hamdolsun {nick}. Sen nasilsin, canin ne cekiyor bugun?",
)

BANTER_REPLY_TEMPLATES: tuple[str, ...] = (
    "{nick}, guzel laf 🙂 {topic} Burada gurmeler de var, muhabbet uzar.",
    "Haha {nick}, tam bu odanin muhabbeti bu. {topic}",
    "{nick}, devam et dinliyorum — KuruPilav kulaklari acik 🍚",
    "Oyle mi {nick}? Ben de takildim, {topic}",
)

THANKS_REPLY_TEMPLATES: tuple[str, ...] = (
    "Rica ederim {nick}! Afiyet olsun — pilav kuru, sohbet sulu kalsin.",
    "Ne demek {nick}, her zaman. Baska bir sey olursa yaz.",
    "Ben tesekkur ederim {nick} — iyi sohbet.",
)

LIVE_SEARCH_ASK_CRAVING_TEMPLATES: tuple[str, ...] = (
    "{nick}, tamam karn gurulduyu anladim 🙂 Ne cekiyor canin — doner, ocakbasi? Soyle, arama metnini vereyim.",
    "Hadi {nick}, once ne istedigini soyle: {topic} Sonra sana tek satirlik arama yazisi veririm.",
    "{nick}, mekan ismi saymam ben — ne tur yemek ariyorsun, onu netlestirelim.",
)

LIVE_SEARCH_GUIDE_TEMPLATES: tuple[str, ...] = (
    (
        "Tamam {nick}! Mekan ismi vermem ama ipucu: Kesfet'te «{query}» yaz — konum aciksa yakinlari siralar. "
        "Az cikarsa «{relaxed_query}» dene."
    ),
    (
        "{nick}, hadi pratik: arama kutusuna «{query}». 4,5+ ile basla, yetmezse «{relaxed_query}». "
        "Gurmeler de fikir verir burada."
    ),
)

GENERAL_REPLY_TEMPLATES: tuple[str, ...] = BANTER_REPLY_TEMPLATES

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

HALHATIR_KEYWORDS: tuple[str, ...] = (
    "naber",
    "nbr",
    "nasilsin",
    "nasılsın",
    "nasil gidiyor",
    "nasıl gidiyor",
    "keyifler",
    "ne haber",
    "naberler",
    "iyi misin",
    "nasılsınız",
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
