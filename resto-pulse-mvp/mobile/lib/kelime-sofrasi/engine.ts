import { SOFRA_MIN_KELIME_UZUNLUGU } from '@/constants/kelime-sofrasi';
import { cevapNormalize } from '@/lib/kelime-yarismasi/turkce-metin';

import type { SofraGridCell, SofraPlacedWord, SofraPuzzle } from './types';

export function normalizeKelime(raw: string): string {
  return cevapNormalize(raw);
}

export function kelimeCarktanOlusur(kelime: string, wheel: string[], path: number[]): boolean {
  const norm = normalizeKelime(kelime);
  if (norm.length < SOFRA_MIN_KELIME_UZUNLUGU || path.length !== norm.length) {
    return false;
  }
  const used = new Set<number>();
  for (let i = 0; i < norm.length; i++) {
    const idx = path[i]!;
    if (used.has(idx) || wheel[idx] !== norm[i]) {
      return false;
    }
    used.add(idx);
  }
  return true;
}

export function hedefKelimeMi(puzzle: SofraPuzzle, kelime: string): SofraPlacedWord | null {
  const norm = normalizeKelime(kelime);
  return puzzle.words.find((w) => normalizeKelime(w.kelime) === norm) ?? null;
}

export function bulmacaTamamlandi(puzzle: SofraPuzzle, foundWordIds: string[]): boolean {
  return puzzle.words.every((w) => foundWordIds.includes(w.id));
}

export function gridHucreleriDoldur(
  grid: (SofraGridCell | null)[][],
  word: SofraPlacedWord,
): (SofraGridCell | null)[][] {
  const norm = normalizeKelime(word.kelime);
  const next = grid.map((row) => row.map((cell) => (cell ? { ...cell, wordIds: [...cell.wordIds] } : null)));
  for (let i = 0; i < norm.length; i++) {
    const row = word.direction === 'h' ? word.row : word.row + i;
    const col = word.direction === 'h' ? word.col + i : word.col;
    const cell = next[row]?.[col];
    if (cell) {
      cell.letter = norm[i]!;
    }
  }
  return next;
}

export function carkKaristir(wheel: string[], order: number[], rand: () => number): number[] {
  const next = [...order];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

export function baslangicCarkSirasi(wheel: string[], rand: () => number): number[] {
  const order = wheel.map((_, i) => i);
  return carkKaristir(wheel, order, rand);
}
