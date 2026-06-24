import type { SofraDirection, SofraGridCell, SofraPlacedWord } from './types';
import { sofraKelimeBuyuk } from './turkce-harf';
import { isTdkKelime, tdkLexicon } from './tdk-lexicon';

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
      buf = '';
    } else {
      buf = '';
    }
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
    if (!isTdkKelime(normRun)) {
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

/** API/disk grid JSON → GridMap (oyun ekranındaki ızgara). */
export function gridMatrixToMap(grid: (SofraGridCell | null)[][]): GridMap {
  const out: GridMap = new Map();
  for (let rowIdx = 0; rowIdx < grid.length; rowIdx++) {
    const row = grid[rowIdx];
    if (!row) continue;
    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      const cell = row[colIdx];
      if (!cell?.letter) continue;
      const r = cell.row ?? rowIdx;
      const c = cell.col ?? colIdx;
      out.set(gridKey(r, c), {
        letter: sofraKelimeBuyuk(cell.letter),
        wordIds: [...cell.wordIds],
      });
    }
  }
  return out;
}

/** Kayıtlı grid üzerinde koşu denetimi — words yerleşimi ile aynı kural. */
export function validateStoredSofraGrid(
  grid: (SofraGridCell | null)[][],
  words: SofraPlacedWord[],
  minWordLen = 3,
): { ok: boolean; invalid: string[] } {
  const targets = new Set(words.map((w) => sofraKelimeBuyuk(w.kelime)));
  const audit = auditContiguousRuns(gridMatrixToMap(grid), targets, tdkLexicon(), minWordLen);
  return { ok: audit.ok, invalid: audit.invalid };
}

/** Izgara üzerindeki tüm 2+ harfli koşular sözlükte ve hedef kelimelerden biri olmalı. */
/** Aynı satır/sütunda kısa kelime uzun kelimenin parçası mı? (DAM ⊂ IDAM) */
export function isSameAxisSubstring(
  short: SofraPlacedWord,
  long: SofraPlacedWord,
): boolean {
  const shortNorm = sofraKelimeBuyuk(short.kelime);
  const longNorm = sofraKelimeBuyuk(long.kelime);
  if (shortNorm.length >= longNorm.length) return false;
  if (short.direction !== long.direction) return false;

  if (short.direction === 'h') {
    if (short.row !== long.row) return false;
    const sStart = short.col;
    const sEnd = short.col + shortNorm.length;
    const lStart = long.col;
    const lEnd = long.col + longNorm.length;
    return sStart >= lStart && sEnd <= lEnd;
  }

  if (short.col !== long.col) return false;
  const sStart = short.row;
  const sEnd = short.row + shortNorm.length;
  const lStart = long.row;
  const lEnd = long.row + longNorm.length;
  return sStart >= lStart && sEnd <= lEnd;
}

export function hasSameAxisSubstringPair(words: SofraPlacedWord[]): boolean {
  for (let i = 0; i < words.length; i++) {
    for (let j = 0; j < words.length; j++) {
      if (i === j) continue;
      if (isSameAxisSubstring(words[i]!, words[j]!)) return true;
    }
  }
  return false;
}

/** Önek/sonek çiftleri — GEL ⊂ GELİN gibi kafa karıştıran bulmacalar. */
export function hasPartialWordPair(words: SofraPlacedWord[]): boolean {
  for (let i = 0; i < words.length; i++) {
    for (let j = 0; j < words.length; j++) {
      if (i === j) continue;
      const short = sofraKelimeBuyuk(words[i]!.kelime);
      const long = sofraKelimeBuyuk(words[j]!.kelime);
      if (short.length >= long.length) continue;
      if (long.startsWith(short) || long.endsWith(short)) return true;
    }
  }
  return false;
}

export function validateSofraCrossword(
  placed: SofraPlacedWord[],
  lexicon: ReadonlySet<string>,
  minWordLen = 3,
): { ok: boolean; invalid: string[] } {
  if (!placed.length) return { ok: false, invalid: ['empty'] };
  if (hasSameAxisSubstringPair(placed)) {
    return { ok: false, invalid: ['same_axis_substring'] };
  }
  if (hasPartialWordPair(placed)) {
    return { ok: false, invalid: ['partial_word_pair'] };
  }
  const targets = new Set(placed.map((w) => sofraKelimeBuyuk(w.kelime)));
  const audit = auditContiguousRuns(placedWordsToGrid(placed), targets, lexicon, minWordLen);
  return { ok: audit.ok, invalid: audit.invalid };
}
