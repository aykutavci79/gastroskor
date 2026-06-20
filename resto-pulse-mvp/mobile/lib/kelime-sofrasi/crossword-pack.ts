import { SOFRA_MIN_KELIME_UZUNLUGU, SOFRA_UC_HARF_MIN } from '@/constants/kelime-sofrasi';
import type { HavuzKelime } from '@/lib/kelime-sofrasi/havuz';
import { sofraKelimeBuyuk } from '@/lib/kelime-sofrasi/turkce-harf';
import { shuffled } from '@/lib/mini-sudoku/rng';

import {
  auditContiguousRuns,
  gridKey,
  type GridMap,
  validateSofraCrossword,
} from './grid-runs';
import { tdkLexicon } from './tdk-lexicon';
import type { SofraDirection, SofraPlacedWord } from './types';

export type PackStats = {
  lexiconRejections: number;
  placementsTried: number;
  backtracks: number;
  stallReason?: string;
};

const PACK_DEADLINE_MS = 12_000;
const YIELD_EVERY_MS = 12;

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function createYieldGate() {
  let lastYield = Date.now();
  return async () => {
    const now = Date.now();
    if (now - lastYield >= YIELD_EVERY_MS) {
      lastYield = now;
      await yieldToUi();
    }
  };
}

function wordCells(row: number, col: number, dir: SofraDirection, kelime: string) {
  const cells: { row: number; col: number; index: number }[] = [];
  for (let i = 0; i < kelime.length; i++) {
    cells.push({
      row: dir === 'h' ? row : row + i,
      col: dir === 'h' ? col + i : col,
      index: i,
    });
  }
  return cells;
}

function cellBefore(row: number, col: number, dir: SofraDirection) {
  return dir === 'h' ? { row, col: col - 1 } : { row: row - 1, col };
}

function cellAfter(row: number, col: number, dir: SofraDirection, len: number) {
  return dir === 'h' ? { row, col: col + len } : { row: row + len, col };
}

function canPlace(
  grid: GridMap,
  row: number,
  col: number,
  dir: SofraDirection,
  kelime: string,
  requireCross: boolean,
  lexicon: ReadonlySet<string>,
  placed: SofraPlacedWord[],
): { ok: boolean; crossCount: number; invalidRuns?: string[] } {
  const norm = sofraKelimeBuyuk(kelime);
  const cells = wordCells(row, col, dir, norm);
  let crossCount = 0;

  for (const cell of cells) {
    const existing = grid.get(gridKey(cell.row, cell.col));
    if (existing) {
      if (existing.letter !== norm[cell.index]) return { ok: false, crossCount: 0 };
      crossCount++;
    }
  }

  if (requireCross && crossCount === 0) return { ok: false, crossCount: 0 };

  const before = cellBefore(row, col, dir);
  const after = cellAfter(row, col, dir, norm.length);
  if (grid.has(gridKey(before.row, before.col))) return { ok: false, crossCount: 0 };
  if (grid.has(gridKey(after.row, after.col))) return { ok: false, crossCount: 0 };

  const trial = cloneGrid(grid);
  applyPlace(trial, '__trial__', row, col, dir, norm);
  const targets = new Set([
    ...placed.map((w) => sofraKelimeBuyuk(w.kelime)),
    norm,
  ]);
  const audit = auditContiguousRuns(trial, targets, lexicon, SOFRA_MIN_KELIME_UZUNLUGU);
  if (audit.mustRejectPlacement) {
    return { ok: false, crossCount: 0, invalidRuns: audit.invalid };
  }

  return { ok: true, crossCount };
}

function applyPlace(
  grid: GridMap,
  wordId: string,
  row: number,
  col: number,
  dir: SofraDirection,
  kelime: string,
): void {
  for (const cell of wordCells(row, col, dir, kelime)) {
    const k = gridKey(cell.row, cell.col);
    const existing = grid.get(k);
    if (existing) {
      if (!existing.wordIds.includes(wordId)) existing.wordIds.push(wordId);
    } else {
      grid.set(k, { letter: kelime[cell.index]!, wordIds: [wordId] });
    }
  }
}

function findPlacements(
  grid: GridMap,
  placed: SofraPlacedWord[],
  kelime: string,
  lexicon: ReadonlySet<string>,
): { row: number; col: number; direction: SofraDirection; crossCount: number }[] {
  const options: { row: number; col: number; direction: SofraDirection; crossCount: number }[] = [];
  const norm = sofraKelimeBuyuk(kelime);

  if (placed.length === 0) {
    const check = canPlace(grid, 0, 0, 'h', norm, false, lexicon, []);
    if (check.ok) options.push({ row: 0, col: 0, direction: 'h', crossCount: 0 });
    return options;
  }

  for (const anchor of placed) {
    const anchorWord = sofraKelimeBuyuk(anchor.kelime);
    for (let i = 0; i < anchorWord.length; i++) {
      for (let j = 0; j < norm.length; j++) {
        if (anchorWord[i] !== norm[j]) continue;
        const newDir: SofraDirection = anchor.direction === 'h' ? 'v' : 'h';
        let row = 0;
        let col = 0;
        if (anchor.direction === 'h') {
          row = anchor.row - j;
          col = anchor.col + i;
        } else {
          row = anchor.row + i;
          col = anchor.col - j;
        }
        const check = canPlace(grid, row, col, newDir, norm, true, lexicon, placed);
        if (check.ok) {
          options.push({ row, col, direction: newDir, crossCount: check.crossCount });
        }
      }
    }
  }

  return options;
}

function countShortWords(placed: SofraPlacedWord[]): number {
  return placed.filter((w) => sofraKelimeBuyuk(w.kelime).length === 3).length;
}

function orderCandidates(
  candidates: HavuzKelime[],
  placed: SofraPlacedWord[],
  rand: () => number,
): HavuzKelime[] {
  const shortPlaced = countShortWords(placed);
  const needShort = placed.length > 0 && shortPlaced < SOFRA_UC_HARF_MIN;

  return shuffled(candidates, rand).sort((a, b) => {
    if (placed.length === 0) {
      return b.kelime.length - a.kelime.length;
    }
    const aShort = a.kelime.length === 3 ? 1 : 0;
    const bShort = b.kelime.length === 3 ? 1 : 0;
    if (needShort) {
      return bShort - aShort || b.kelime.length - a.kelime.length;
    }
    return b.kelime.length - a.kelime.length;
  });
}

function isBetterPack(
  attempt: SofraPlacedWord[],
  best: SofraPlacedWord[] | null,
  minWords: number,
): boolean {
  if (!best) return attempt.length >= minWords;
  if (attempt.length !== best.length) return attempt.length > best.length;
  return countShortWords(attempt) > countShortWords(best);
}

function cloneGrid(grid: GridMap): GridMap {
  const next = new Map<string, { letter: string; wordIds: string[] }>();
  for (const [k, v] of grid) {
    next.set(k, { letter: v.letter, wordIds: [...v.wordIds] });
  }
  return next;
}

function packIsValid(placed: SofraPlacedWord[], lexicon: ReadonlySet<string>): boolean {
  return validateSofraCrossword(placed, lexicon, SOFRA_MIN_KELIME_UZUNLUGU).ok;
}

function normalizeOrigin(words: SofraPlacedWord[]): SofraPlacedWord[] {
  if (!words.length) return words;
  let minRow = Infinity;
  let minCol = Infinity;
  for (const w of words) {
    minRow = Math.min(minRow, w.row);
    minCol = Math.min(minCol, w.col);
    const len = sofraKelimeBuyuk(w.kelime).length;
    if (w.direction === 'v') minRow = Math.min(minRow, w.row);
    if (w.direction === 'h') minCol = Math.min(minCol, w.col);
  }
  const dr = -minRow;
  const dc = -minCol;
  return words.map((w) => ({ ...w, row: w.row + dr, col: w.col + dc }));
}

function packBacktrack(
  candidates: HavuzKelime[],
  candIndex: number,
  grid: GridMap,
  placed: SofraPlacedWord[],
  used: Set<string>,
  lexicon: ReadonlySet<string>,
  rand: () => number,
  targetWords: number,
  stats: PackStats,
  deadline: number,
): SofraPlacedWord[] | null {
  if (Date.now() > deadline) {
    stats.stallReason = 'timeout';
    return null;
  }
  if (placed.length === targetWords) {
    if (!packIsValid(placed, lexicon)) return null;
    return normalizeOrigin(placed);
  }

  const ordered = orderCandidates(
    candidates.filter((c) => !used.has(c.kelime)),
    placed,
    rand,
  );

  for (const candidate of ordered) {
    const kelime = candidate.kelime;

    const options = findPlacements(grid, placed, kelime, lexicon);
    if (!options.length) continue;

    const sorted = shuffled(options, rand).sort(
      (a, b) => b.crossCount - a.crossCount || a.row - b.row || a.col - b.col,
    );

    for (const pick of sorted) {
      stats.placementsTried++;
      const requireCross = placed.length > 0;
      const check = canPlace(
        grid,
        pick.row,
        pick.col,
        pick.direction,
        kelime,
        requireCross,
        lexicon,
        placed,
      );
      if (!check.ok) {
        if (check.invalidRuns?.length) stats.lexiconRejections++;
        continue;
      }

      const nextGrid = cloneGrid(grid);
      const id = candidate.id || `w-${placed.length}`;
      applyPlace(nextGrid, id, pick.row, pick.col, pick.direction, kelime);
      const nextPlaced: SofraPlacedWord[] = [
        ...placed,
        {
          id,
          kelime,
          ipucu: candidate.ipucu,
          row: pick.row,
          col: pick.col,
          direction: pick.direction,
        },
      ];
      const nextUsed = new Set(used);
      nextUsed.add(kelime);

      const result = packBacktrack(
        candidates,
        0,
        nextGrid,
        nextPlaced,
        nextUsed,
        lexicon,
        rand,
        targetWords,
        stats,
        deadline,
      );
      if (result) return result;

      stats.backtracks++;
    }
  }

  return null;
}

async function packBacktrackAsync(
  candidates: HavuzKelime[],
  candIndex: number,
  grid: GridMap,
  placed: SofraPlacedWord[],
  used: Set<string>,
  lexicon: ReadonlySet<string>,
  rand: () => number,
  targetWords: number,
  stats: PackStats,
  deadline: number,
  yieldGate: () => Promise<void>,
): Promise<SofraPlacedWord[] | null> {
  if (Date.now() > deadline) {
    stats.stallReason = 'timeout';
    return null;
  }
  await yieldGate();
  if (placed.length === targetWords) {
    if (!packIsValid(placed, lexicon)) return null;
    return normalizeOrigin(placed);
  }

  const ordered = orderCandidates(
    candidates.filter((c) => !used.has(c.kelime)),
    placed,
    rand,
  );

  for (const candidate of ordered) {
    const kelime = candidate.kelime;

    const options = findPlacements(grid, placed, kelime, lexicon);
    if (!options.length) continue;

    const sorted = shuffled(options, rand).sort(
      (a, b) => b.crossCount - a.crossCount || a.row - b.row || a.col - b.col,
    );

    for (const pick of sorted) {
      stats.placementsTried++;
      const requireCross = placed.length > 0;
      const check = canPlace(
        grid,
        pick.row,
        pick.col,
        pick.direction,
        kelime,
        requireCross,
        lexicon,
        placed,
      );
      if (!check.ok) {
        if (check.invalidRuns?.length) stats.lexiconRejections++;
        continue;
      }

      const nextGrid = cloneGrid(grid);
      const id = candidate.id || `w-${placed.length}`;
      applyPlace(nextGrid, id, pick.row, pick.col, pick.direction, kelime);
      const nextPlaced: SofraPlacedWord[] = [
        ...placed,
        {
          id,
          kelime,
          ipucu: candidate.ipucu,
          row: pick.row,
          col: pick.col,
          direction: pick.direction,
        },
      ];
      const nextUsed = new Set(used);
      nextUsed.add(kelime);

      const result = await packBacktrackAsync(
        candidates,
        0,
        nextGrid,
        nextPlaced,
        nextUsed,
        lexicon,
        rand,
        targetWords,
        stats,
        deadline,
        yieldGate,
      );
      if (result) return result;

      stats.backtracks++;
    }
  }

  return null;
}

async function packWithLexiconAsync(
  candidates: HavuzKelime[],
  rand: () => number,
  targetWords: number,
  stats: PackStats,
): Promise<SofraPlacedWord[] | null> {
  if (!candidates.length) return null;
  const lexicon = tdkLexicon();
  const deadline = Date.now() + PACK_DEADLINE_MS;
  const yieldGate = createYieldGate();
  return packBacktrackAsync(
    orderCandidates(candidates, [], rand),
    0,
    new Map(),
    [],
    new Set(),
    lexicon,
    rand,
    targetWords,
    stats,
    deadline,
    yieldGate,
  );
}

function buildStarters(
  candidates: HavuzKelime[],
  rand: () => number,
  forcedStarter?: HavuzKelime,
): HavuzKelime[] {
  const longCandidates = candidates.filter((w) => w.kelime.length >= 4);
  if (forcedStarter && longCandidates.some((w) => w.kelime === forcedStarter.kelime)) {
    const rest = shuffled(
      longCandidates.filter((w) => w.kelime !== forcedStarter.kelime),
      rand,
    );
    return [forcedStarter, ...rest].slice(0, 10);
  }
  return shuffled(longCandidates, rand).slice(0, 10);
}

export async function packCrosswordFromCandidatesAsync(
  candidates: HavuzKelime[],
  rand: () => number,
  minWords: number,
  maxWords: number,
  outStats?: PackStats,
  forcedStarter?: HavuzKelime,
): Promise<SofraPlacedWord[] | null> {
  if (candidates.length < minWords) return null;

  const aggregate: PackStats = outStats ?? {
    lexiconRejections: 0,
    placementsTried: 0,
    backtracks: 0,
  };

  let best: SofraPlacedWord[] | null = null;
  const starters = buildStarters(candidates, rand, forcedStarter);
  const yieldGate = createYieldGate();

  for (const starter of starters) {
    await yieldGate();
    const attemptStats: PackStats = {
      lexiconRejections: 0,
      placementsTried: 0,
      backtracks: 0,
    };
    const others = shuffled(
      candidates.filter((w) => w.kelime !== starter.kelime),
      rand,
    );
    const attempt = await packWithLexiconAsync([starter, ...others], rand, maxWords, attemptStats);
    aggregate.lexiconRejections += attemptStats.lexiconRejections;
    aggregate.placementsTried += attemptStats.placementsTried;
    aggregate.backtracks += attemptStats.backtracks;
    if (attemptStats.stallReason) aggregate.stallReason = attemptStats.stallReason;

    if (!attempt || attempt.length < minWords) continue;
    if (minWords === maxWords && attempt.length !== maxWords) continue;
    if (!packIsValid(attempt, tdkLexicon())) continue;
    if (isBetterPack(attempt, best, minWords)) best = attempt;
    if (best && best.length >= maxWords && countShortWords(best) >= SOFRA_UC_HARF_MIN) break;
  }

  if (!best && !aggregate.stallReason) {
    aggregate.stallReason = 'no_valid_placement';
  }

  return best;
}

function packWithLexicon(
  candidates: HavuzKelime[],
  rand: () => number,
  targetWords: number,
  stats: PackStats,
): SofraPlacedWord[] | null {
  if (!candidates.length) return null;
  const lexicon = tdkLexicon();
  const deadline = Date.now() + PACK_DEADLINE_MS;
  return packBacktrack(
    orderCandidates(candidates, [], rand),
    0,
    new Map(),
    [],
    new Set(),
    lexicon,
    rand,
    targetWords,
    stats,
    deadline,
  );
}

export function packCrosswordFromCandidates(
  candidates: HavuzKelime[],
  rand: () => number,
  minWords: number,
  maxWords: number,
  outStats?: PackStats,
  forcedStarter?: HavuzKelime,
): SofraPlacedWord[] | null {
  if (candidates.length < minWords) return null;

  const aggregate: PackStats = outStats ?? {
    lexiconRejections: 0,
    placementsTried: 0,
    backtracks: 0,
  };

  let best: SofraPlacedWord[] | null = null;
  const starters = buildStarters(candidates, rand, forcedStarter);

  for (const starter of starters) {
    const attemptStats: PackStats = {
      lexiconRejections: 0,
      placementsTried: 0,
      backtracks: 0,
    };
    const others = shuffled(
      candidates.filter((w) => w.kelime !== starter.kelime),
      rand,
    );
    const attempt = packWithLexicon([starter, ...others], rand, maxWords, attemptStats);
    aggregate.lexiconRejections += attemptStats.lexiconRejections;
    aggregate.placementsTried += attemptStats.placementsTried;
    aggregate.backtracks += attemptStats.backtracks;
    if (attemptStats.stallReason) aggregate.stallReason = attemptStats.stallReason;

    if (!attempt || attempt.length < minWords) continue;
    if (minWords === maxWords && attempt.length !== maxWords) continue;
    if (!packIsValid(attempt, tdkLexicon())) continue;
    if (isBetterPack(attempt, best, minWords)) best = attempt;
    if (best && best.length >= maxWords && countShortWords(best) >= SOFRA_UC_HARF_MIN) break;
  }

  if (!best && !aggregate.stallReason) {
    aggregate.stallReason = 'no_valid_placement';
  }

  return best;
}
