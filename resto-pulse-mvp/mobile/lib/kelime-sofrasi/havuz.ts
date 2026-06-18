import havuzJson from '@/data/kelime-sofrasi/havuz.json';
import yazilisMap from '@/data/kelime-sofrasi/kelime-yazilis.json';

import { sofraKelimeBuyuk } from '@/lib/kelime-sofrasi/turkce-harf';

export type HavuzKelime = {
  id: string;
  kelime: string;
  harfSayisi: number;
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
  };
});

export function sofraHavuzu(): readonly HavuzKelime[] {
  return HAVUZ;
}

export function havuzKelimeFiltre(minLen: number, maxLen: number): HavuzKelime[] {
  return HAVUZ.filter((w) => w.kelime.length >= minLen && w.kelime.length <= maxLen);
}
