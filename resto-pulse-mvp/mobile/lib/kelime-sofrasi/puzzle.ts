import {
  SOFRA_MAX_HEDEF,
  SOFRA_MIN_HEDEF,
  SOFRA_MIN_KELIME_UZUNLUGU,
  SOFRA_WHEEL_MAX,
  SOFRA_WHEEL_MIN,
} from '@/constants/kelime-sofrasi';
import type { EglenceZorluk } from '@/constants/eglence-zorluk';
import { SOFRA_KELIME_HEDEF, sofraPuzzleKey } from '@/constants/eglence-zorluk';
import { packCrosswordFromCandidates } from '@/lib/kelime-sofrasi/crossword-pack';
import { cantadanKelimeAdaylari } from '@/lib/kelime-sofrasi/letter-bag';
import type { HavuzKelime } from '@/lib/kelime-sofrasi/havuz';
import { havuzKelimeFiltre } from '@/lib/kelime-sofrasi/havuz';
import { sofraKelimeBuyuk } from '@/lib/kelime-sofrasi/turkce-harf';
import { mulberry32, seedFromString } from '@/lib/mini-sudoku/rng';
import { activePuzzleId } from '@/lib/mini-sudoku/schedule';

import type { SofraGridCell, SofraPlacedWord, SofraPuzzle } from './types';

/** Modül yüklendiğinde bir kez filtrelenir — her bulmacada tekrar tarama yok. */
const POOL = havuzKelimeFiltre(SOFRA_MIN_KELIME_UZUNLUGU, SOFRA_WHEEL_MAX);
const SEED_WORDS = POOL.filter(
  (w) => w.kelime.length >= SOFRA_WHEEL_MIN && w.kelime.length <= SOFRA_WHEEL_MAX,
);

/** WOW referans setleri — yoğun çapraz ızgara üretemezsek sırayla dene */
const FALLBACK_SEEDS = ['ARSLAN', 'ASLAN', 'KALEM', 'BALIK'];

function compileGrid(words: SofraPlacedWord[]): {
  grid: (SofraGridCell | null)[][];
  rows: number;
  cols: number;
} {
  let maxRow = 0;
  let maxCol = 0;
  for (const w of words) {
    const len = sofraKelimeBuyuk(w.kelime).length;
    maxRow = Math.max(maxRow, w.direction === 'h' ? w.row : w.row + len - 1);
    maxCol = Math.max(maxCol, w.direction === 'h' ? w.col + len - 1 : w.col);
  }
  const rows = maxRow + 1;
  const cols = maxCol + 1;
  const grid: (SofraGridCell | null)[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null),
  );

  for (const w of words) {
    const norm = sofraKelimeBuyuk(w.kelime);
    for (let i = 0; i < norm.length; i++) {
      const row = w.direction === 'h' ? w.row : w.row + i;
      const col = w.direction === 'h' ? w.col + i : w.col;
      const letter = norm[i]!;
      const existing = grid[row]![col];
      if (existing) {
        if (existing.letter !== letter) {
          throw new Error('Sofra grid çakışması');
        }
        if (!existing.wordIds.includes(w.id)) {
          existing.wordIds.push(w.id);
        }
      } else {
        grid[row]![col] = { row, col, letter, wordIds: [w.id] };
      }
    }
  }

  return { grid, rows, cols };
}

function wheelFromSeed(seed: string, rand: () => number): string[] {
  const letters = [...sofraKelimeBuyuk(seed)];
  const order = letters.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order.map((i) => letters[i]!);
}

function bonusFromCandidates(candidates: HavuzKelime[], placed: SofraPlacedWord[]): string[] {
  const onGrid = new Set(placed.map((w) => sofraKelimeBuyuk(w.kelime)));
  return candidates
    .filter((w) => !onGrid.has(w.kelime))
    .map((w) => w.kelime)
    .sort((a, b) => a.length - b.length || a.localeCompare(b, 'tr'));
}

function buildPuzzleFromWheel(
  puzzleId: string,
  wheel: string[],
  rand: () => number,
  zorluk: EglenceZorluk,
  kelimeHedef: number,
): SofraPuzzle | null {
  const candidates = cantadanKelimeAdaylari(wheel, POOL);
  const placed = packCrosswordFromCandidates(candidates, rand, kelimeHedef, kelimeHedef);
  if (!placed || placed.length !== kelimeHedef) return null;

  const { grid, rows, cols } = compileGrid(placed);
  return {
    id: puzzleId,
    zorluk,
    words: placed,
    bonusKelimeler: bonusFromCandidates(candidates, placed),
    wheel,
    rows,
    cols,
    grid,
  };
}

function fallbackPuzzle(puzzleId: string, rand: () => number, zorluk: EglenceZorluk): SofraPuzzle {
  const kelimeHedef = SOFRA_KELIME_HEDEF[zorluk];
  for (let i = 0; i < FALLBACK_SEEDS.length; i++) {
    const seed = FALLBACK_SEEDS[i]!;
    const wheel = wheelFromSeed(seed, rand);
    const retryRand = mulberry32(seedFromString(`${puzzleId}:fallback:${i}`));
    const built = buildPuzzleFromWheel(puzzleId, wheel, retryRand, zorluk, kelimeHedef);
    if (built) return built;
  }

  const wheel = wheelFromSeed(FALLBACK_SEEDS[0]!, rand);
  const words: SofraPlacedWord[] = [
    {
      id: 'fb-h',
      kelime: 'ARSLAN',
      ipucu: 'Ormanların kralı',
      row: 0,
      col: 0,
      direction: 'h',
    },
    {
      id: 'fb-v1',
      kelime: 'ALAN',
      ipucu: 'Bölge, mekan',
      row: 0,
      col: 0,
      direction: 'v',
    },
  ];
  const { grid, rows, cols } = compileGrid(words);
  const fbCandidates = cantadanKelimeAdaylari(wheel, POOL);
  return {
    id: puzzleId,
    zorluk,
    words,
    bonusKelimeler: bonusFromCandidates(fbCandidates, words),
    wheel,
    rows,
    cols,
    grid,
  };
}

const MAX_SEED_ATTEMPTS = 20;

export function buildDailySofraPuzzle(
  gunId = activePuzzleId(),
  zorluk: EglenceZorluk = 'orta',
): SofraPuzzle {
  const puzzleId = sofraPuzzleKey(gunId, zorluk);
  const kelimeHedef = SOFRA_KELIME_HEDEF[zorluk];
  const rand = mulberry32(seedFromString(`gastro-kelime-sofrasi:${puzzleId}`));
  if (!SEED_WORDS.length) return fallbackPuzzle(puzzleId, rand, zorluk);

  const start = seedFromString(`${puzzleId}:anchor`) % SEED_WORDS.length;

  for (let attempt = 0; attempt < MAX_SEED_ATTEMPTS; attempt++) {
    const anchor = SEED_WORDS[(start + attempt) % SEED_WORDS.length]!;
    const wheel = wheelFromSeed(anchor.kelime, rand);
    const built = buildPuzzleFromWheel(puzzleId, wheel, rand, zorluk, kelimeHedef);
    if (built && built.words.length === kelimeHedef) return built;
  }

  return fallbackPuzzle(puzzleId, rand, zorluk);
}

export function todaySofraPuzzleId(now = new Date()): string {
  return activePuzzleId(now);
}
