import type { HavuzKelime } from '@/lib/kelime-sofrasi/havuz';
import { sofraKelimeBuyuk } from '@/lib/kelime-sofrasi/turkce-harf';
import { shuffled } from '@/lib/mini-sudoku/rng';

import type { SofraDirection, SofraPlacedWord } from './types';

type GridMap = Map<string, { letter: string; wordIds: string[] }>;

function key(row: number, col: number): string {
  return `${row},${col}`;
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
): { ok: boolean; crossCount: number } {
  const cells = wordCells(row, col, dir, kelime);
  let crossCount = 0;

  for (const cell of cells) {
    const existing = grid.get(key(cell.row, cell.col));
    if (existing) {
      if (existing.letter !== kelime[cell.index]) return { ok: false, crossCount: 0 };
      crossCount++;
    }
  }

  if (requireCross && crossCount === 0) return { ok: false, crossCount: 0 };

  const before = cellBefore(row, col, dir);
  const after = cellAfter(row, col, dir, kelime.length);
  if (grid.has(key(before.row, before.col))) return { ok: false, crossCount: 0 };
  if (grid.has(key(after.row, after.col))) return { ok: false, crossCount: 0 };

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
    const k = key(cell.row, cell.col);
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
): { row: number; col: number; direction: SofraDirection; crossCount: number }[] {
  const options: { row: number; col: number; direction: SofraDirection; crossCount: number }[] = [];

  if (placed.length === 0) {
    const check = canPlace(grid, 0, 0, 'h', kelime, false);
    if (check.ok) options.push({ row: 0, col: 0, direction: 'h', crossCount: 0 });
    return options;
  }

  for (const anchor of placed) {
    const anchorWord = sofraKelimeBuyuk(anchor.kelime);
    for (let i = 0; i < anchorWord.length; i++) {
      for (let j = 0; j < kelime.length; j++) {
        if (anchorWord[i] !== kelime[j]) continue;
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
        const check = canPlace(grid, row, col, newDir, kelime, true);
        if (check.ok) {
          options.push({ row, col, direction: newDir, crossCount: check.crossCount });
        }
      }
    }
  }

  return options;
}

function cloneGrid(grid: GridMap): GridMap {
  const next = new Map<string, { letter: string; wordIds: string[] }>();
  for (const [k, v] of grid) {
    next.set(k, { letter: v.letter, wordIds: [...v.wordIds] });
  }
  return next;
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

function packGreedy(candidates: HavuzKelime[], rand: () => number, maxWords: number): SofraPlacedWord[] | null {
  if (!candidates.length) return null;

  const ordered = shuffled(candidates, rand).sort((a, b) => b.kelime.length - a.kelime.length);
  const first = ordered[0]!;
  const grid: GridMap = new Map();
  const placed: SofraPlacedWord[] = [
    {
      id: first.id,
      kelime: first.kelime,
      ipucu: first.ipucu,
      row: 0,
      col: 0,
      direction: 'h',
    },
  ];
  applyPlace(grid, first.id, 0, 0, 'h', first.kelime);

  const used = new Set<string>([first.kelime]);
  const rest = shuffled(ordered.slice(1), rand);

  for (const candidate of rest) {
    if (placed.length >= maxWords) break;
    const kelime = candidate.kelime;
    if (used.has(kelime)) continue;

    const options = findPlacements(grid, placed, kelime);
    if (!options.length) continue;

    options.sort((a, b) => b.crossCount - a.crossCount || a.row - b.row || a.col - b.col);
    const pick = options[0]!;
    const nextGrid = cloneGrid(grid);
    const id = candidate.id || `w-${placed.length}`;
    const check = canPlace(nextGrid, pick.row, pick.col, pick.direction, kelime, placed.length > 0);
    if (!check.ok) continue;

    applyPlace(nextGrid, id, pick.row, pick.col, pick.direction, kelime);
    for (const k of nextGrid.keys()) grid.set(k, nextGrid.get(k)!);

    placed.push({
      id,
      kelime,
      ipucu: candidate.ipucu,
      row: pick.row,
      col: pick.col,
      direction: pick.direction,
    });
    used.add(kelime);
  }

  return normalizeOrigin(placed);
}

export function packCrosswordFromCandidates(
  candidates: HavuzKelime[],
  rand: () => number,
  minWords: number,
  maxWords: number,
): SofraPlacedWord[] | null {
  if (candidates.length < minWords) return null;

  let best: SofraPlacedWord[] | null = null;
  const starters = shuffled(candidates.filter((w) => w.kelime.length >= 4), rand).slice(0, 4);

  for (const starter of starters) {
    const others = candidates.filter((w) => w.kelime !== starter.kelime);
    const attempt = packGreedy([starter, ...others], rand, maxWords);
    if (!attempt || attempt.length < minWords) continue;
    if (minWords === maxWords && attempt.length !== maxWords) continue;
    if (!best || attempt.length > best.length) best = attempt;
    if (best.length >= maxWords) break;
  }

  return best;
}
