import havuzJson from '@/data/kelime-sofrasi/havuz.json';
import yazilisMap from '@/data/kelime-sofrasi/kelime-yazilis.json';

import { sofraKelimeBuyuk } from '@/lib/kelime-sofrasi/turkce-harf';

export type HavuzKelime = {
  id: string;
  kelime: string;
  harfSayisi: number;
  frekansSira?: number;
  ipucu?: string;
};

function havuzKelimeFormu(asciiKelime: string): string {
  const mapped = (yazilisMap as Record<string, string>)[asciiKelime] ?? asciiKelime;
  return sofraKelimeBuyuk(mapped);
}

const HAVUZ: HavuzKelime[] = (havuzJson as HavuzKelime[]).map((row) => {
  const kelime = havuzKelimeFormu(row.kelime);
  return {
    ...row,
    kelime,
    harfSayisi: kelime.length,
    frekansSira: row.frekansSira,
  };
});

export function sofraHavuzu(): readonly HavuzKelime[] {
  return HAVUZ;
}

export function havuzKelimeFiltre(minLen: number, maxLen: number): HavuzKelime[] {
  return HAVUZ.filter((w) => w.kelime.length >= minLen && w.kelime.length <= maxLen);
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
