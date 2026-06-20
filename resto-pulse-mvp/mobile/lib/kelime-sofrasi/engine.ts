import { SOFRA_BONUS_HINT_THRESHOLD, SOFRA_MAX_IPUCU, SOFRA_MIN_KELIME_UZUNLUGU } from '@/constants/kelime-sofrasi';

import type { SofraGridCell, SofraPlacedWord, SofraPuzzle } from './types';
import { isSameAxisSubstring } from './grid-runs';
import { sofraKelimeBuyuk, sofraKelimeEsit } from './turkce-harf';

export function normalizeKelime(raw: string): string {
  return sofraKelimeBuyuk(raw);
}

export function kelimeCarktanOlusur(kelime: string, wheel: string[], path: number[]): boolean {
  const norm = sofraKelimeBuyuk(kelime);
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

export function harfCantasindanOlusur(kelime: string, wheel: string[]): boolean {
  const norm = sofraKelimeBuyuk(kelime);
  const bag = new Map<string, number>();
  for (const ch of wheel) {
    bag.set(ch, (bag.get(ch) ?? 0) + 1);
  }
  for (const ch of norm) {
    const left = bag.get(ch) ?? 0;
    if (left <= 0) return false;
    bag.set(ch, left - 1);
  }
  return true;
}

export function hedefKelimeMi(puzzle: SofraPuzzle, kelime: string): SofraPlacedWord | null {
  const norm = sofraKelimeBuyuk(kelime);
  return puzzle.words.find((w) => sofraKelimeEsit(w.kelime, norm)) ?? null;
}

/** Kısa kelime, aynı eksende henüz bulunmamış uzun kelimenin parçasıysa spoiler sayılır. */
export function sameAxisSubstringSpoiler(
  words: readonly SofraPlacedWord[],
  candidate: SofraPlacedWord,
  foundWordIds: readonly string[],
): SofraPlacedWord | null {
  const found = new Set(foundWordIds);
  for (const long of words) {
    if (long.id === candidate.id || found.has(long.id)) continue;
    if (isSameAxisSubstring(candidate, long)) return long;
  }
  return null;
}

export function bonusKelimeMi(puzzle: SofraPuzzle, kelime: string): boolean {
  const norm = sofraKelimeBuyuk(kelime);
  return puzzle.bonusKelimeler.some((w) => sofraKelimeEsit(w, norm));
}

export function bulmacaTamamlandi(puzzle: SofraPuzzle, foundWordIds: string[]): boolean {
  return puzzle.words.every((w) => foundWordIds.includes(w.id));
}

export function gridHucreleriDoldur(
  grid: (SofraGridCell | null)[][],
  word: SofraPlacedWord,
): (SofraGridCell | null)[][] {
  const norm = sofraKelimeBuyuk(word.kelime);
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

export function hucreAnahtar(row: number, col: number): string {
  return `${row},${col}`;
}

export function hucreAcikMi(
  cell: SofraGridCell,
  foundWordIds: string[],
  hintedCells: Set<string> | readonly string[],
  allWords?: readonly SofraPlacedWord[],
): boolean {
  const hinted =
    hintedCells instanceof Set ? hintedCells : new Set(hintedCells);
  if (hinted.has(hucreAnahtar(cell.row, cell.col))) return true;

  for (const id of cell.wordIds) {
    if (!foundWordIds.includes(id)) continue;
    if (!allWords?.length) return true;

    const word = allWords.find((w) => w.id === id);
    if (!word) return true;
    // DAM bulundu ama IDAM henüz yok → ortak hücreleri gösterme
    if (sameAxisSubstringSpoiler(allWords, word, foundWordIds)) continue;
    return true;
  }
  return false;
}

/** Izgara kelimesinin tüm hücreleri bulundu veya ipucu ile açıldı mı? */
export function kelimeTamamenAcikMi(
  word: SofraPlacedWord,
  puzzle: SofraPuzzle,
  foundWordIds: string[],
  hintedCells: readonly string[],
): boolean {
  const norm = sofraKelimeBuyuk(word.kelime);
  const hinted = new Set(hintedCells);
  for (let i = 0; i < norm.length; i++) {
    const row = word.direction === 'h' ? word.row : word.row + i;
    const col = word.direction === 'h' ? word.col + i : word.col;
    const cell = puzzle.grid[row]?.[col];
    if (!cell) return false;
    if (!hucreAcikMi(cell, foundWordIds, hinted, puzzle.words)) return false;
  }
  return true;
}

/** İpucu ile tamamen görünen ama henüz işaretlenmemiş hedef kelimeler. */
export function ipucuIleOtomatikBulunanKelimeIdleri(
  puzzle: SofraPuzzle,
  foundWordIds: string[],
  hintedCells: readonly string[],
): string[] {
  const found = new Set(foundWordIds);
  return puzzle.words
    .filter((w) => !found.has(w.id))
    .filter((w) => kelimeTamamenAcikMi(w, puzzle, foundWordIds, hintedCells))
    .map((w) => w.id);
}

/** Henüz açılmamış rastgele bir ızgara hücresi seçer. */
export function sonrakiIpucuHucresi(
  puzzle: SofraPuzzle,
  foundWordIds: string[],
  hintedCells: string[],
  rand: () => number,
): { row: number; col: number; letter: string } | null {
  const hinted = new Set(hintedCells);
  const found = new Set(foundWordIds);
  const adaylar: { row: number; col: number; letter: string }[] = [];

  for (const row of puzzle.grid) {
    for (const cell of row) {
      if (!cell) continue;
      if (hinted.has(hucreAnahtar(cell.row, cell.col))) continue;
      if (cell.wordIds.some((id) => found.has(id))) continue;
      adaylar.push({ row: cell.row, col: cell.col, letter: cell.letter });
    }
  }

  if (!adaylar.length) return null;
  return adaylar[Math.floor(rand() * adaylar.length)]!;
}

export function sofraMaxIpucu(bonusFoundCount: number): number {
  const bonusExtra = Math.floor(bonusFoundCount / SOFRA_BONUS_HINT_THRESHOLD);
  return SOFRA_MAX_IPUCU + bonusExtra;
}

export function ipucuHakkiKaldi(hintedCount: number, bonusFoundCount = 0): boolean {
  return hintedCount < sofraMaxIpucu(bonusFoundCount);
}

export function bonusIpucuIlerleme(bonusFoundCount: number): {
  cycle: number;
  hedef: number;
} {
  const cycle = bonusFoundCount % SOFRA_BONUS_HINT_THRESHOLD;
  return { cycle, hedef: SOFRA_BONUS_HINT_THRESHOLD };
}
