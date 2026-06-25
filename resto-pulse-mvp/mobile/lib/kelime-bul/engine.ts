import {
  KELIME_BUL_GRID_RETRY,
  KELIME_BUL_GRID_SIZE,
  KELIME_BUL_MAX_WORDS,
  KELIME_BUL_MIN_WORDS,
} from '@/constants/kelime-bul';
import { sofraKelimeBuyuk, sofraKelimeEsit } from '@/lib/kelime-sofrasi/turkce-harf';
import { mulberry32, seedFromString, shuffled } from '@/lib/mini-sudoku/rng';

import { kelimeBulGenelHavuz, KELIME_BUL_YEMEK_HAVUZ } from './words';

export type KelimeBulPuzzle = {
  puzzleId: string;
  grid: string[][];
  words: string[];
};

const TURKISH_FILLER = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';

const DIRECTIONS = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 1, dc: 1 },
  { dr: -1, dc: 1 },
  { dr: 0, dc: -1 },
  { dr: -1, dc: 0 },
  { dr: -1, dc: -1 },
  { dr: 1, dc: -1 },
] as const;

function randomFiller(rand: () => number): string {
  const idx = Math.floor(rand() * TURKISH_FILLER.length);
  return TURKISH_FILLER.charAt(idx) || 'A';
}

function canPlace(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  dr: number,
  dc: number,
): boolean {
  const size = grid.length;
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (r < 0 || c < 0 || r >= size || c >= size) return false;
    const existing = grid[r]![c]!;
    if (existing && existing !== word.charAt(i)) return false;
  }
  return true;
}

function placeWord(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  dr: number,
  dc: number,
): void {
  for (let i = 0; i < word.length; i++) {
    grid[row + dr * i]![col + dc * i] = word.charAt(i);
  }
}

function tryGenerateGrid(words: string[], rand: () => number, size: number): string[][] | null {
  const grid: (string | null)[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null),
  );

  const sorted = [...words].sort((a, b) => b.length - a.length);

  for (const raw of sorted) {
    const word = sofraKelimeBuyuk(raw);
    let placed = false;
    for (let attempt = 0; attempt < 40 && !placed; attempt++) {
      const dirs = shuffled([...DIRECTIONS], rand);
      for (const { dr, dc } of dirs) {
        const candidates: { row: number; col: number }[] = [];
        for (let row = 0; row < size; row++) {
          for (let col = 0; col < size; col++) {
            const endR = row + dr * (word.length - 1);
            const endC = col + dc * (word.length - 1);
            if (endR >= 0 && endR < size && endC >= 0 && endC < size) {
              candidates.push({ row, col });
            }
          }
        }
        if (!candidates.length) continue;
        const pick = candidates[Math.floor(rand() * candidates.length)]!;
        if (!canPlace(grid, word, pick.row, pick.col, dr, dc)) continue;
        placeWord(grid, word, pick.row, pick.col, dr, dc);
        placed = true;
        break;
      }
    }
    if (!placed) return null;
  }

  return grid.map((row) => row.map((cell) => cell ?? randomFiller(rand)));
}

function pickWords(_seed: string, rand: () => number): string[] {
  const count =
    KELIME_BUL_MIN_WORDS +
    Math.floor(rand() * (KELIME_BUL_MAX_WORDS - KELIME_BUL_MIN_WORDS + 1));

  const yemek = shuffled(KELIME_BUL_YEMEK_HAVUZ, rand)[0]!;
  const genel = shuffled(kelimeBulGenelHavuz(), rand).filter((w) => w !== yemek);
  const restCount = Math.max(0, count - 1);
  const rest = genel.slice(0, restCount);

  if (rest.length < restCount) {
    const ekYemek = shuffled(
      KELIME_BUL_YEMEK_HAVUZ.filter((w) => w !== yemek),
      rand,
    ).slice(0, restCount - rest.length);
    return shuffled([yemek, ...rest, ...ekYemek], rand).slice(0, count);
  }

  return shuffled([yemek, ...rest], rand);
}

export function uretKelimeBulBulmaca(puzzleId: string): KelimeBulPuzzle {
  for (let attempt = 0; attempt < KELIME_BUL_GRID_RETRY; attempt++) {
    const rand = mulberry32(seedFromString(`${puzzleId}:grid:${attempt}`));
    const words = pickWords(puzzleId, rand);
    const grid = tryGenerateGrid(words, rand, KELIME_BUL_GRID_SIZE);
    if (grid) {
      return { puzzleId, grid, words };
    }
  }
  throw new Error('Kelime Bul ızgarası üretilemedi');
}

export function hucreIndeksi(row: number, col: number, size: number): number {
  return row * size + col;
}

export function hucreKoordinat(index: number, size: number): { row: number; col: number } {
  return { row: Math.floor(index / size), col: index % size };
}

/** Düz çizgi hücre yolu (8 yön). Geçersizse null. */
export function hucreYolu(
  r0: number,
  c0: number,
  r1: number,
  c1: number,
): { row: number; col: number }[] | null {
  const dr = r1 - r0;
  const dc = c1 - c0;
  if (dr === 0 && dc === 0) return [{ row: r0, col: c0 }];
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  if (steps === 0) return null;
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
  const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
  const stepC = dc === 0 ? 0 : dc / Math.abs(dc);
  const path: { row: number; col: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    path.push({ row: r0 + stepR * i, col: c0 + stepC * i });
  }
  return path;
}

export function yolMetni(grid: string[][], path: { row: number; col: number }[]): string {
  return path.map(({ row, col }) => grid[row]?.[col] ?? '').join('');
}

export function tersKelime(kelime: string): string {
  return [...kelime].reverse().join('');
}

export function eslesenKelime(metin: string, hedefler: string[]): string | null {
  const normalized = sofraKelimeBuyuk(metin);
  const reversed = tersKelime(normalized);
  for (const word of hedefler) {
    if (sofraKelimeEsit(normalized, word) || sofraKelimeEsit(reversed, word)) {
      return sofraKelimeBuyuk(word);
    }
  }
  return null;
}

export function hucreAnahtar(row: number, col: number): string {
  return `${row},${col}`;
}

/** Bulunan kelimelerin hücreleri — yalnızca foundWords değişince çağır (oyun içi sıcak yol). */
export function hucrelerBulunanKelimeler(
  grid: string[][],
  foundWords: string[],
): Set<string> {
  const keys = new Set<string>();
  if (!foundWords.length) return keys;

  const size = grid.length;
  const targets = new Set(foundWords.map(sofraKelimeBuyuk));

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      for (const { dr, dc } of DIRECTIONS) {
        let text = '';
        const cells: string[] = [];
        for (let i = 0; i < size; i++) {
          const r = row + dr * i;
          const c = col + dc * i;
          if (r < 0 || c < 0 || r >= size || c >= size) break;
          text += grid[r]![c]!;
          cells.push(hucreAnahtar(r, c));
          const norm = sofraKelimeBuyuk(text);
          const rev = tersKelime(norm);
          const len = text.length;
          if ((targets.has(norm) && len === norm.length) || (targets.has(rev) && len === rev.length)) {
            for (const key of cells) keys.add(key);
          }
        }
      }
    }
  }
  return keys;
}

/** @deprecated hucrelerBulunanKelimeler kullan — bu fonksiyon her prefix'te eslesenKelime çağırır. */
export function bulunanHucreler(
  grid: string[][],
  _words: string[],
  foundWords: string[],
): Set<string> {
  return hucrelerBulunanKelimeler(grid, foundWords);
}
