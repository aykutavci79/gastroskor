import type { SofraDirection, SofraPlacedWord } from './types';
import { sofraKelimeBuyuk } from './turkce-harf';

export type GridMap = Map<string, { letter: string; wordIds: string[] }>;

export type ContiguousRunAudit = {
  ok: boolean;
  invalid: string[];
  /** Boşluk eklenemez — bu yerleşim iptal, başka konum dene. */
  mustRejectPlacement: boolean;
};

export function gridKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function gridBounds(grid: GridMap): { minRow: number; maxRow: number; minCol: number; maxCol: number } {
  let minRow = 0;
  let maxRow = 0;
  let minCol = 0;
  let maxCol = 0;
  let first = true;
  for (const k of grid.keys()) {
    const [r, c] = k.split(',').map(Number) as [number, number];
    if (first) {
      minRow = maxRow = r;
      minCol = maxCol = c;
      first = false;
    } else {
      minRow = Math.min(minRow, r);
      maxRow = Math.max(maxRow, r);
      minCol = Math.min(minCol, c);
      maxCol = Math.max(maxCol, c);
    }
  }
  return { minRow, maxRow, minCol, maxCol };
}

function runsInLine(letters: (string | null)[]): string[] {
  const runs: string[] = [];
  let buf = '';
  for (const ch of letters) {
    if (ch) {
      buf += ch;
    } else if (buf.length >= 2) {
      runs.push(buf);
    }
    buf = '';
  }
  if (buf.length >= 2) runs.push(buf);
  return runs;
}

/** Izgara uzerindeki tum 2+ harfli satir/sutun dizileri. */
export function extractGridRuns(grid: GridMap): string[] {
  if (grid.size === 0) return [];
  const { minRow, maxRow, minCol, maxCol } = gridBounds(grid);
  const runs: string[] = [];

  for (let row = minRow; row <= maxRow; row++) {
    const line: (string | null)[] = [];
    for (let col = minCol; col <= maxCol; col++) {
      line.push(grid.get(gridKey(row, col))?.letter ?? null);
    }
    runs.push(...runsInLine(line));
  }

  for (let col = minCol; col <= maxCol; col++) {
    const line: (string | null)[] = [];
    for (let row = minRow; row <= maxRow; row++) {
      line.push(grid.get(gridKey(row, col))?.letter ?? null);
    }
    runs.push(...runsInLine(line));
  }

  return runs;
}

export function affectedRowsCols(
  row: number,
  col: number,
  dir: SofraDirection,
  kelime: string,
): { rows: Set<number>; cols: Set<number> } {
  const rows = new Set<number>();
  const cols = new Set<number>();
  for (let i = 0; i < kelime.length; i++) {
    const r = dir === 'h' ? row : row + i;
    const c = dir === 'h' ? col + i : col;
    rows.add(r);
    cols.add(c);
  }
  return { rows, cols };
}

export function extractRunsForAxes(
  grid: GridMap,
  rows: Set<number>,
  cols: Set<number>,
): string[] {
  if (grid.size === 0) return [];
  const { minRow, maxRow, minCol, maxCol } = gridBounds(grid);
  const runs: string[] = [];

  for (const row of rows) {
    if (row < minRow || row > maxRow) continue;
    const line: (string | null)[] = [];
    for (let col = minCol; col <= maxCol; col++) {
      line.push(grid.get(gridKey(row, col))?.letter ?? null);
    }
    runs.push(...runsInLine(line));
  }

  for (const col of cols) {
    if (col < minCol || col > maxCol) continue;
    const line: (string | null)[] = [];
    for (let row = minRow; row <= maxRow; row++) {
      line.push(grid.get(gridKey(row, col))?.letter ?? null);
    }
    runs.push(...runsInLine(line));
  }

  return runs;
}

export function allRunsValid(runs: string[], lexicon: ReadonlySet<string>): boolean {
  for (const run of runs) {
    if (run.length >= 2 && !lexicon.has(sofraKelimeBuyuk(run))) return false;
  }
  return true;
}

/**
 * Satır/sütunda boşluksuz bitişik 2+ harf = kelime koşusu.
 * - TDK'da yoksa geçersiz (HENA, ES, …).
 * - minTargetLen+ ve hedef kelime değilse geçersiz (orphan ALE, …).
 * Koşu kilitliyse araya boşluk konamaz → mustRejectPlacement.
 */
export function auditContiguousRuns(
  grid: GridMap,
  targetWords: ReadonlySet<string>,
  lexicon: ReadonlySet<string>,
  minTargetLen = 3,
): ContiguousRunAudit {
  const runs = extractGridRuns(grid);
  const invalid: string[] = [];
  for (const run of runs) {
    if (run.length < 2) continue;
    const normRun = sofraKelimeBuyuk(run);
    if (!lexicon.has(normRun)) {
      invalid.push(normRun);
      continue;
    }
    if (normRun.length >= minTargetLen && !targetWords.has(normRun)) {
      invalid.push(`orphan:${normRun}`);
    }
  }
  return {
    ok: invalid.length === 0,
    invalid,
    mustRejectPlacement: invalid.length > 0,
  };
}

export function placedWordsToGrid(words: SofraPlacedWord[]): GridMap {
  const grid: GridMap = new Map();
  for (const w of words) {
    const norm = sofraKelimeBuyuk(w.kelime);
    for (let i = 0; i < norm.length; i++) {
      const row = w.direction === 'h' ? w.row : w.row + i;
      const col = w.direction === 'h' ? w.col + i : w.col;
      const letter = norm[i]!;
      const k = gridKey(row, col);
      const existing = grid.get(k);
      if (existing) {
        if (existing.letter !== letter) {
          throw new Error('Sofra grid çakışması');
        }
        if (!existing.wordIds.includes(w.id)) existing.wordIds.push(w.id);
      } else {
        grid.set(k, { letter, wordIds: [w.id] });
      }
    }
  }
  return grid;
}

/** Izgara üzerindeki tüm 2+ harfli koşular sözlükte ve hedef kelimelerden biri olmalı. */
export function validateSofraCrossword(
  placed: SofraPlacedWord[],
  lexicon: ReadonlySet<string>,
  minWordLen = 3,
): { ok: boolean; invalid: string[] } {
  if (!placed.length) return { ok: false, invalid: ['empty'] };
  const targets = new Set(placed.map((w) => sofraKelimeBuyuk(w.kelime)));
  const audit = auditContiguousRuns(placedWordsToGrid(placed), targets, lexicon, minWordLen);
  return { ok: audit.ok, invalid: audit.invalid };
}
