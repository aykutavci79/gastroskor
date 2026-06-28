import {
  SOFRA_MIN_KELIME_UZUNLUGU,
  SOFRA_WHEEL_MAX,
  SOFRA_WHEEL_MIN,
} from '@/constants/kelime-sofrasi';
import type { EglenceZorluk } from '@/constants/eglence-zorluk';
import { SOFRA_KELIME_MAX, SOFRA_KELIME_MIN, sofraKelimeSayisiGecerli } from '@/constants/eglence-zorluk';
import {
  applyAiHintsToWords,
  qaPuzzleWithGroq,
  suggestWordsWithAi,
  type AiQaVerdict,
} from '@/lib/kelime-sofrasi/ai-puzzle-assist';
import { packCrosswordFromCandidatesAsync } from '@/lib/kelime-sofrasi/crossword-pack';
import { validateSofraCrossword } from '@/lib/kelime-sofrasi/grid-runs';
import { cantadanKelimeAdaylari, sofraBonusKelimeleri } from '@/lib/kelime-sofrasi/letter-bag';
import type { HavuzKelime } from '@/lib/kelime-sofrasi/havuz';
import { havuzKelimeFiltre, havuzZorlukFiltre } from '@/lib/kelime-sofrasi/havuz';
import { tdkLexicon } from '@/lib/kelime-sofrasi/tdk-lexicon';
import { sofraKelimeBuyuk, sofraKelimeEsit } from '@/lib/kelime-sofrasi/turkce-harf';
import { mulberry32, seedFromString } from '@/lib/mini-sudoku/rng';

import type { SofraGridCell, SofraPlacedWord, SofraPuzzle } from './types';

const MAX_ATTEMPTS = 48;

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
  return poolForZorluk(zorluk).filter(
    (w) => w.kelime.length >= SOFRA_WHEEL_MIN && w.kelime.length <= SOFRA_WHEEL_MAX,
  );
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
        if (existing.letter !== letter) throw new Error('Sofra grid çakışması');
        if (!existing.wordIds.includes(w.id)) existing.wordIds.push(w.id);
      } else {
        grid[row]![col] = { row, col, letter, wordIds: [w.id] };
      }
    }
  }
  return { grid, rows, cols };
}

function bonusFromWheel(
  wheel: string[],
  pool: HavuzKelime[],
  placed: SofraPlacedWord[],
  extra: string[] = [],
): string[] {
  return sofraBonusKelimeleri(wheel, placed, pool, extra);
}

function toAiCandidate(kelime: string, pool: HavuzKelime[], hints: Record<string, string>): HavuzKelime | null {
  const norm = sofraKelimeBuyuk(kelime);
  const fromPool = pool.find((p) => sofraKelimeEsit(p.kelime, norm));
  if (fromPool) return fromPool;
  if (!tdkLexicon().has(norm)) return null;
  return {
    id: `ai-${norm.toLowerCase()}`,
    kelime: norm,
    harfSayisi: norm.length,
    ipucu: hints[norm],
  };
}

function prioritizeCandidates(
  base: HavuzKelime[],
  priorityWords: string[],
  pool: HavuzKelime[],
  hints: Record<string, string>,
): HavuzKelime[] {
  const seen = new Set<string>();
  const front: HavuzKelime[] = [];
  for (const w of priorityWords) {
    const c = toAiCandidate(w, pool, hints);
    if (!c || seen.has(c.kelime)) continue;
    seen.add(c.kelime);
    front.push(c);
  }
  const rest = base.filter((c) => !seen.has(c.kelime));
  return [...front, ...rest];
}

function isStructurallyValid(puzzle: SofraPuzzle, zorluk: EglenceZorluk): boolean {
  if (!sofraKelimeSayisiGecerli(zorluk, puzzle.words.length)) return false;
  if (puzzle.words.some((w) => w.id.startsWith('fb-'))) return false;
  return validateSofraCrossword(puzzle.words, tdkLexicon(), SOFRA_MIN_KELIME_UZUNLUGU).ok;
}

export type BuildAiPuzzleResult = {
  puzzle: SofraPuzzle | null;
  aiUsed: boolean;
  qa: AiQaVerdict | null;
  attempts: number;
};

export async function tryBuildSofraPuzzleAiAssisted(
  puzzleId: string,
  zorluk: EglenceZorluk,
  options: { useAi?: boolean; useQa?: boolean; qaMinScore?: number } = {},
): Promise<BuildAiPuzzleResult> {
  const minWords = SOFRA_KELIME_MIN[zorluk];
  const maxWords = SOFRA_KELIME_MAX[zorluk];
  const seedWords = seedWordsForZorluk(zorluk);
  const pool = poolForZorluk(zorluk);
  const rand = mulberry32(seedFromString(`gastro-kelime-sofrasi:${puzzleId}`));
  const useAi =
    options.useAi !== false &&
    Boolean(process.env.GROQ_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim());
  const useQa = options.useQa !== false && Boolean(process.env.GROQ_API_KEY?.trim());
  const qaMinScore = options.qaMinScore ?? 6;

  if (!seedWords.length) {
    return { puzzle: null, aiUsed: false, qa: null, attempts: 0 };
  }

  const start = seedFromString(`${puzzleId}:anchor`) % seedWords.length;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const anchor = seedWords[(start + attempt) % seedWords.length]!;
    let wheel = wheelFromSeed(anchor.kelime, rand);
    let priorityWords: string[] = [];
    let hints: Record<string, string> = {};
    let bonusExtra: string[] = [];
    let aiUsed = false;

    if (useAi && attempt < 12) {
      const { suggestion: ai } = await suggestWordsWithAi(wheel, zorluk, maxWords);
      if (ai?.wheelSeed && ai.wheelSeed.length >= SOFRA_WHEEL_MIN) {
        wheel = wheelFromSeed(ai.wheelSeed, rand);
        priorityWords = ai.targetWords;
        hints = ai.hints;
        bonusExtra = ai.bonusWords;
        aiUsed = true;
      }
    }

    const baseCandidates = cantadanKelimeAdaylari(wheel, pool);
    const candidates = prioritizeCandidates(baseCandidates, priorityWords, pool, hints);
    const forcedStarter =
      candidates.find((c) => sofraKelimeEsit(c.kelime, anchor.kelime)) ??
      candidates.find((c) => priorityWords.some((p) => sofraKelimeEsit(p, c.kelime)));

    const placed = await packCrosswordFromCandidatesAsync(
      candidates,
      rand,
      minWords,
      maxWords,
      undefined,
      forcedStarter,
    );
    if (!placed || !sofraKelimeSayisiGecerli(zorluk, placed.length)) continue;

    const words = applyAiHintsToWords(placed, hints);
    const { grid, rows, cols } = compileGrid(words);
    const puzzle: SofraPuzzle = {
      id: puzzleId,
      zorluk,
      words,
      bonusKelimeler: bonusFromWheel(wheel, pool, words, bonusExtra),
      wheel,
      rows,
      cols,
      grid,
    };

    if (!isStructurallyValid(puzzle, zorluk)) continue;

    let qa: AiQaVerdict | null = null;
    if (useQa && aiUsed) {
      qa = await qaPuzzleWithGroq(puzzle);
      if (qa && (!qa.ok || qa.score < qaMinScore)) continue;
    }

    return { puzzle, aiUsed, qa, attempts: attempt + 1 };
  }

  return { puzzle: null, aiUsed: false, qa: null, attempts: MAX_ATTEMPTS };
}

export function sofraBankPuzzleKey(bankIndex: number, zorluk: EglenceZorluk, tur = 0): string {
  const base = `bank-${String(bankIndex).padStart(4, '0')}:${zorluk}`;
  return tur > 0 ? `${base}:t${tur}` : base;
}
