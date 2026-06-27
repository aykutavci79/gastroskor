import { KELIME_BUL_MAX_WORD_LEN } from '@/constants/kelime-bul';
import { havuzKelimeFiltre, havuzZorlukFiltre } from '@/lib/kelime-sofrasi/havuz';
import { sofraKelimeBuyuk } from '@/lib/kelime-sofrasi/turkce-harf';

const MIN_LEN = 3;

/** Bulmaca başına en fazla bir yemek temalı kelime. */
export const KELIME_BUL_YEMEK_RAW = [
  'KEBAP',
  'LAHMACUN',
  'PIDE',
  'TAVUK',
  'BALIK',
  'ÇORBA',
  'KÖFTE',
  'PİLAV',
  'SALATA',
  'BÖREK',
  'MANTI',
  'DÖNER',
  'KUMRU',
  'KOKOREÇ',
  'MUSAKKA',
  'İSKENDER',
  'KUMPİR',
  'TOST',
  'KAHVE',
  'ÇAY',
  'SUCUK',
  'PEYNİR',
  'ZERDE',
  'BAKLAVA',
  'LOKUM',
  'SİMİT',
  'MENEMEN',
  'GÖZLEME',
  'LAHANA',
  'PATATES',
] as const;

export const KELIME_BUL_YEMEK_HAVUZ: string[] = [
  ...new Set(KELIME_BUL_YEMEK_RAW.map(sofraKelimeBuyuk)),
].filter((w) => w.length >= MIN_LEN && w.length <= KELIME_BUL_MAX_WORD_LEN);

/** @deprecated KELIME_BUL_YEMEK_HAVUZ */
export const KELIME_BUL_HAVUZ = KELIME_BUL_YEMEK_HAVUZ;

let genelHavuzCache: string[] | null = null;

/**
 * Ipucusuz word-search hedefleri icin yalnizca daha sik kullanılan kelimeler.
 * Tam TDK lexicon'u MORTO/OZUGA/HERTZ gibi dogru ama oyuncuya haksiz gelen girdiler icerir.
 */
export function kelimeBulGenelHavuz(): string[] {
  if (genelHavuzCache) return genelHavuzCache;
  const yemek = new Set(KELIME_BUL_YEMEK_HAVUZ);
  const kolayHavuz = havuzZorlukFiltre(
    havuzKelimeFiltre(MIN_LEN, KELIME_BUL_MAX_WORD_LEN),
    'kolay',
  );
  genelHavuzCache = [
    ...new Set(
      kolayHavuz
        .map((row) => sofraKelimeBuyuk(row.kelime))
        .filter((w) => w.length >= MIN_LEN && w.length <= KELIME_BUL_MAX_WORD_LEN && !yemek.has(w)),
    ),
  ];
  return genelHavuzCache;
}
