import {
  SOFRA_MAX_HEDEF,
  SOFRA_MIN_HEDEF,
  SOFRA_MIN_KELIME_UZUNLUGU,
  SOFRA_WHEEL_MAX,
  SOFRA_WHEEL_MIN,
} from '@/constants/kelime-sofrasi';
import type { EglenceZorluk } from '@/constants/eglence-zorluk';
import { SOFRA_KELIME_HEDEF, sofraPuzzleKey } from '@/constants/eglence-zorluk';
import { packCrosswordFromCandidates, packCrosswordFromCandidatesAsync } from '@/lib/kelime-sofrasi/crossword-pack';
import { validateSofraCrossword } from '@/lib/kelime-sofrasi/grid-runs';
import { tdkLexicon } from '@/lib/kelime-sofrasi/tdk-lexicon';
import { cantadanKelimeAdaylari } from '@/lib/kelime-sofrasi/letter-bag';
import type { HavuzKelime } from '@/lib/kelime-sofrasi/havuz';
import { havuzKelimeFiltre, havuzZorlukFiltre } from '@/lib/kelime-sofrasi/havuz';
import { sofraKelimeBuyuk, sofraKelimeEsit } from '@/lib/kelime-sofrasi/turkce-harf';
import { mulberry32, seedFromString } from '@/lib/mini-sudoku/rng';
import { activePuzzleId } from '@/lib/mini-sudoku/schedule';

import type { SofraGridCell, SofraPlacedWord, SofraPuzzle } from './types';

/** Modül yüklendiğinde bir kez filtrelenir — her bulmacada tekrar tarama yok. */
let poolBaseCache: HavuzKelime[] | null = null;

function poolBase(): HavuzKelime[] {
  if (!poolBaseCache) {
    poolBaseCache = havuzKelimeFiltre(SOFRA_MIN_KELIME_UZUNLUGU, SOFRA_WHEEL_MAX);
  }
  return poolBaseCache;
}

function poolForZorluk(zorluk: EglenceZorluk): HavuzKelime[] {
  const filtered = havuzZorlukFiltre(poolBase(), zorluk);
  return filtered.length >= 80 ? filtered : poolBase();
}

function seedWordsForZorluk(zorluk: EglenceZorluk): HavuzKelime[] {
  const pool = poolForZorluk(zorluk);
  return pool.filter(
    (w) => w.kelime.length >= SOFRA_WHEEL_MIN && w.kelime.length <= SOFRA_WHEEL_MAX,
  );
}

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
  anchorKelime?: string,
): SofraPuzzle | null {
  const pool = poolForZorluk(zorluk);
  const candidates = cantadanKelimeAdaylari(wheel, pool);
  const anchorCandidate = anchorKelime
    ? candidates.find((c) => sofraKelimeEsit(c.kelime, anchorKelime))
    : undefined;
  const placed = packCrosswordFromCandidates(
    candidates,
    rand,
    kelimeHedef,
    kelimeHedef,
    undefined,
    anchorCandidate,
  );
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

async function buildPuzzleFromWheelAsync(
  puzzleId: string,
  wheel: string[],
  rand: () => number,
  zorluk: EglenceZorluk,
  kelimeHedef: number,
  anchorKelime?: string,
): Promise<SofraPuzzle | null> {
  const pool = poolForZorluk(zorluk);
  const candidates = cantadanKelimeAdaylari(wheel, pool);
  const anchorCandidate = anchorKelime
    ? candidates.find((c) => sofraKelimeEsit(c.kelime, anchorKelime))
    : undefined;
  const placed = await packCrosswordFromCandidatesAsync(
    candidates,
    rand,
    kelimeHedef,
    kelimeHedef,
    undefined,
    anchorCandidate,
  );
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

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function fallbackPuzzle(puzzleId: string, rand: () => number, zorluk: EglenceZorluk): SofraPuzzle {
  const kelimeHedef = SOFRA_KELIME_HEDEF[zorluk];
  for (let i = 0; i < FALLBACK_SEEDS.length; i++) {
    const seed = FALLBACK_SEEDS[i]!;
    const wheel = wheelFromSeed(seed, rand);
    const retryRand = mulberry32(seedFromString(`${puzzleId}:fallback:${i}`));
    const built = buildPuzzleFromWheel(puzzleId, wheel, retryRand, zorluk, kelimeHedef);
    if (
      built &&
      validateSofraCrossword(built.words, tdkLexicon(), SOFRA_MIN_KELIME_UZUNLUGU).ok
    ) {
      return built;
    }
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
  const pool = poolForZorluk(zorluk);
  const fbCandidates = cantadanKelimeAdaylari(wheel, pool);
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

const MAX_SEED_ATTEMPTS = 40;

function tryBuildDailySofraPuzzleInternal(
  gunId: string,
  zorluk: EglenceZorluk,
  tur: number,
  asyncPack: false,
): SofraPuzzle | null;
function tryBuildDailySofraPuzzleInternal(
  gunId: string,
  zorluk: EglenceZorluk,
  tur: number,
  asyncPack: true,
): Promise<SofraPuzzle | null>;
function tryBuildDailySofraPuzzleInternal(
  gunId: string,
  zorluk: EglenceZorluk,
  tur: number,
  asyncPack: boolean,
): SofraPuzzle | null | Promise<SofraPuzzle | null> {
  const puzzleId = sofraPuzzleKey(gunId, zorluk, tur);
  const kelimeHedef = SOFRA_KELIME_HEDEF[zorluk];
  const seedWords = seedWordsForZorluk(zorluk);
  const rand = mulberry32(seedFromString(`gastro-kelime-sofrasi:${puzzleId}`));
  if (!seedWords.length) return asyncPack ? Promise.resolve(null) : null;

  const start = seedFromString(`${puzzleId}:anchor`) % seedWords.length;

  const attemptLoop = async (): Promise<SofraPuzzle | null> => {
    for (let attempt = 0; attempt < MAX_SEED_ATTEMPTS; attempt++) {
      if (attempt > 0 && asyncPack) await yieldToUi();
      const anchor = seedWords[(start + attempt) % seedWords.length]!;
      const wheel = wheelFromSeed(anchor.kelime, rand);
      const built = asyncPack
        ? await buildPuzzleFromWheelAsync(puzzleId, wheel, rand, zorluk, kelimeHedef, anchor.kelime)
        : buildPuzzleFromWheel(puzzleId, wheel, rand, zorluk, kelimeHedef, anchor.kelime);
      if (
        built &&
        built.words.length === kelimeHedef &&
        validateSofraCrossword(built.words, tdkLexicon(), SOFRA_MIN_KELIME_UZUNLUGU).ok
      ) {
        return built;
      }
    }
    return null;
  };

  return asyncPack ? attemptLoop() : (() => {
    for (let attempt = 0; attempt < MAX_SEED_ATTEMPTS; attempt++) {
      const anchor = seedWords[(start + attempt) % seedWords.length]!;
      const wheel = wheelFromSeed(anchor.kelime, rand);
      const built = buildPuzzleFromWheel(puzzleId, wheel, rand, zorluk, kelimeHedef, anchor.kelime);
      if (
        built &&
        built.words.length === kelimeHedef &&
        validateSofraCrossword(built.words, tdkLexicon(), SOFRA_MIN_KELIME_UZUNLUGU).ok
      ) {
        return built;
      }
    }
    return null;
  })();
}

/** Havuz üretimi — başarısızsa null (ARSLAN+ALAN yok). */
export function tryBuildDailySofraPuzzle(
  gunId = activePuzzleId(),
  zorluk: EglenceZorluk = 'orta',
  tur = 0,
): SofraPuzzle | null {
  return tryBuildDailySofraPuzzleInternal(gunId, zorluk, tur, false);
}

export async function tryBuildDailySofraPuzzleAsync(
  gunId = activePuzzleId(),
  zorluk: EglenceZorluk = 'orta',
  tur = 0,
): Promise<SofraPuzzle | null> {
  return tryBuildDailySofraPuzzleInternal(gunId, zorluk, tur, true);
}

export function buildDailySofraPuzzle(
  gunId = activePuzzleId(),
  zorluk: EglenceZorluk = 'orta',
  tur = 0,
): SofraPuzzle {
  const built = tryBuildDailySofraPuzzle(gunId, zorluk, tur);
  if (built) return built;
  const puzzleId = sofraPuzzleKey(gunId, zorluk, tur);
  const rand = mulberry32(seedFromString(`gastro-kelime-sofrasi:${puzzleId}`));
  return fallbackPuzzle(puzzleId, rand, zorluk);
}

export async function buildDailySofraPuzzleAsync(
  gunId = activePuzzleId(),
  zorluk: EglenceZorluk = 'orta',
  tur = 0,
): Promise<SofraPuzzle> {
  const built = await tryBuildDailySofraPuzzleAsync(gunId, zorluk, tur);
  if (built) return built;
  const puzzleId = sofraPuzzleKey(gunId, zorluk, tur);
  const rand = mulberry32(seedFromString(`gastro-kelime-sofrasi:${puzzleId}`));
  return fallbackPuzzle(puzzleId, rand, zorluk);
}

export function todaySofraPuzzleId(now = new Date()): string {
  return activePuzzleId(now);
}
