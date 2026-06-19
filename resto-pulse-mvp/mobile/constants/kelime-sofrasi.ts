/** Words of Wonders tarzı — harf çarkından min kelime uzunluğu */
export const SOFRA_MIN_KELIME_UZUNLUGU = 3;

/** Çarktaki harf sayısı (WOW genelde 5–7) */
export const SOFRA_WHEEL_MIN = 5;
export const SOFRA_WHEEL_MAX = 7;

/** Günlük bulmaca — ızgaraya yerleşen kelime sayısı (zorlukla 5–7) */
export const SOFRA_MIN_HEDEF = 5;
export const SOFRA_MAX_HEDEF = 7;

/** Oyunda kullanılabilecek ipucu sayısı */
export const SOFRA_MAX_IPUCU = 8;

/** Ücretsiz ipucu (sonrası jeton) — backend ile uyumlu */
export const SOFRA_FREE_IPUCU = 2;

export const SOFRA_STORAGE_PREFIX = '@gastro/kelime-sofrasi';

/** Yarı saydam açık mavi cam — arka plan hafif görünsün, kutu okunaklı kalsın */
export const SOFRA_TILE_BORDER = 'rgba(0, 0, 0, 0.15)';
export const SOFRA_GLASS_BG = 'rgba(235, 245, 255, 0.86)';
export const SOFRA_GLASS_BG_FOUND = 'rgba(220, 238, 255, 0.92)';
export const SOFRA_GLASS_BG_ACTIVE = 'rgba(140, 195, 250, 0.88)';
export const SOFRA_GLASS_BORDER = 'rgba(96, 158, 220, 0.5)';
export const SOFRA_LETTER_COLOR = '#000000';

/** Çark harfleri — Montserrat Black (assets/fonts/Montserrat-Black.ttf), expo-font ile yüklenir */
export const SOFRA_WHEEL_FONT_FAMILY = 'SofraMontserratBlack';

/** Bu kadar bonus kelime = +1 ipucu hakki */
export const SOFRA_BONUS_HINT_THRESHOLD = 3;

/** Prod: ayni gunluk bulmacayi en fazla 5 kez bitir. Dev: sinirsiz tekrar. */
export const SOFRA_GUNLUK_TAMAMLAMA_LIMIT = __DEV__ ? 999 : 5;
