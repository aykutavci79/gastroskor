import { SOFRA_MIN_KELIME_UZUNLUGU } from '@/constants/kelime-sofrasi';
import type { HavuzKelime } from '@/lib/kelime-sofrasi/havuz';
import { sofraKelimeBuyuk } from '@/lib/kelime-sofrasi/turkce-harf';

export function harfCantasi(letters: string[]): Map<string, number> {
  const bag = new Map<string, number>();
  for (const ch of letters) {
    bag.set(ch, (bag.get(ch) ?? 0) + 1);
  }
  return bag;
}

export function kelimeCantayaSigar(kelime: string, bag: Map<string, number>): boolean {
  const norm = sofraKelimeBuyuk(kelime);
  const scratch = new Map(bag);
  for (const ch of norm) {
    const left = scratch.get(ch) ?? 0;
    if (left <= 0) return false;
    scratch.set(ch, left - 1);
  }
  return true;
}

export function cantadanKelimeAdaylari(
  wheel: string[],
  pool: HavuzKelime[],
  minLen = SOFRA_MIN_KELIME_UZUNLUGU,
): HavuzKelime[] {
  const bag = harfCantasi(wheel);
  const seen = new Set<string>();
  const out: HavuzKelime[] = [];
  for (const row of pool) {
    const norm = sofraKelimeBuyuk(row.kelime);
    if (norm.length < minLen || norm.length > wheel.length) continue;
    if (seen.has(norm)) continue;
    if (!kelimeCantayaSigar(norm, bag)) continue;
    seen.add(norm);
    out.push({ ...row, kelime: norm, harfSayisi: norm.length });
  }
  return out.sort((a, b) => b.kelime.length - a.kelime.length || a.kelime.localeCompare(b.kelime, 'tr'));
}
