import havuzJson from '@/data/kelime-sofrasi/havuz.json';
import ucHarfJson from '@/data/kelime-sofrasi/uc-harf-havuz.json';
import yazilisMap from '@/data/kelime-sofrasi/kelime-yazilis.json';

import { gastroYazilisByAscii } from '@/lib/gastro-lexicon/yazilis';
import { asciiKelimeAnahtar, sofraKelimeBuyuk } from '@/lib/kelime-sofrasi/turkce-harf';

export type HavuzKelime = {
  id: string;
  kelime: string;
  harfSayisi: number;
  frekansSira?: number;
  ipucu?: string;
};

type HavuzKaynak = HavuzKelime & { yazilis?: string };

function havuzKelimeFormu(asciiKelime: string, yazilisOverride?: string): string {
  const key = asciiKelimeAnahtar(asciiKelime);
  const gastroMap = gastroYazilisByAscii();
  const mapped =
    yazilisOverride?.trim() ||
    (yazilisMap as Record<string, string>)[asciiKelime] ||
    gastroMap[key] ||
    asciiKelime;
  return sofraKelimeBuyuk(mapped);
}

function mapHavuzRow(row: HavuzKaynak): HavuzKelime {
  const kelime = havuzKelimeFormu(row.kelime, row.yazilis);
  return {
    ...row,
    kelime,
    harfSayisi: kelime.length,
    frekansSira: row.frekansSira,
  };
}

function buildHavuz(): HavuzKelime[] {
  return [
    ...(havuzJson as HavuzKaynak[]).map(mapHavuzRow),
    ...(ucHarfJson as HavuzKaynak[]).map(mapHavuzRow),
  ];
}

let havuzCache: HavuzKelime[] | null = null;

export function sofraHavuzu(): readonly HavuzKelime[] {
  if (!havuzCache) {
    havuzCache = buildHavuz();
  }
  return havuzCache;
}

export function havuzKelimeFiltre(minLen: number, maxLen: number): HavuzKelime[] {
  return sofraHavuzu().filter((w) => w.kelime.length >= minLen && w.kelime.length <= maxLen);
}

/** frekansSira kucuk = daha sik kullanilan kelime */
const FREKANS_KOLAY_MAX = 5000;
const FREKANS_ORTA_MAX = 15000;

export function havuzZorlukFiltre(
  pool: readonly HavuzKelime[],
  zorluk: 'kolay' | 'orta' | 'zor',
): HavuzKelime[] {
  return pool.filter((w) => {
    const f = w.frekansSira ?? 99_999;
    if (zorluk === 'kolay') return f <= FREKANS_KOLAY_MAX;
    if (zorluk === 'orta') return f <= FREKANS_ORTA_MAX;
    return true;
  });
}
