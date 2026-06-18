import havuzJson from '@/data/kelime-sofrasi/havuz.json';

import { cevapNormalize } from '@/lib/kelime-yarismasi/turkce-metin';

export type HavuzKelime = {
  id: string;
  kelime: string;
  harfSayisi: number;
  ipucu?: string;
};

const HAVUZ: HavuzKelime[] = (havuzJson as HavuzKelime[]).map((row) => {
  const kelime = cevapNormalize(row.kelime);
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
