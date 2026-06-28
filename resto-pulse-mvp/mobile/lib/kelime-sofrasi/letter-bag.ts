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

/** Izgarada olmayan, cark harfleri + TDK/havuz ile olusan tum bonus kelimeler. */
export function sofraBonusKelimeleri(
  wheel: string[],
  placed: readonly { kelime: string }[],
  pool: HavuzKelime[],
  extra: string[] = [],
): string[] {
  const minLen = SOFRA_MIN_KELIME_UZUNLUGU;
  const onGrid = new Set(placed.map((w) => sofraKelimeBuyuk(w.kelime)));
  const bag = harfCantasi(wheel);
  const out = new Set<string>();

  const maybeAdd = (raw: string) => {
    const norm = sofraKelimeBuyuk(raw);
    if (norm.length < minLen || norm.length > wheel.length) return;
    if (onGrid.has(norm)) return;
    if (!kelimeCantayaSigar(norm, bag)) return;
    out.add(norm);
  };

  for (const w of extra) maybeAdd(w);
  for (const row of pool) maybeAdd(row.kelime);
  // Tam TDK taramasi yukleme aninda yapilmaz (7885+ kelime JS'i kilitler).
  // Oyunda bonusKelimeMi() cark + isTdkKelime ile anlik dogrular.

  return [...out].sort((a, b) => a.length - b.length || a.localeCompare(b, 'tr'));
}
