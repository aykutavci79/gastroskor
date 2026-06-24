import { sofraKelimeBuyuk } from '@/lib/kelime-sofrasi/turkce-harf';

/** MVP kelime havuzu — sonra havuz.json'a taşınacak. Max 9 harf. */
export const KELIME_BUL_HAVUZ_RAW = [
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

export const KELIME_BUL_HAVUZ: string[] = [...new Set(KELIME_BUL_HAVUZ_RAW.map(sofraKelimeBuyuk))].filter(
  (w) => w.length >= 3 && w.length <= 9,
);
