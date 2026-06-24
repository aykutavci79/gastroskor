export const KELIME_BUL_STORAGE_PREFIX = 'gastro-kelime-bul';

/** Günlük ücretsiz bulmaca hakkı (17:00 İstanbul dönemi). */
export const KELIME_BUL_GUNLUK_UCRETSIZ = 3;

/** Ek bulmaca maliyeti (GC). */
export const KELIME_BUL_GC_MALIYET = 5;

export const KELIME_BUL_GRID_SIZE = 10;

export const KELIME_BUL_MIN_WORDS = 5;

export const KELIME_BUL_MAX_WORDS = 8;

export const KELIME_BUL_MAX_WORD_LEN = 9;

export const KELIME_BUL_GRID_RETRY = 20;

/** Prod: limit aktif. Dev (Expo): sınırsız ücretsiz, GC kesilmez. */
export const KELIME_BUL_LIMIT_DISABLED =
  typeof (globalThis as { __DEV__?: boolean }).__DEV__ !== 'undefined'
    ? Boolean((globalThis as { __DEV__?: boolean }).__DEV__)
    : process.env.NODE_ENV !== 'production';
