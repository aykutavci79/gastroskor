import type { SofraDirection } from './types';

export type GridMap = Map<string, { letter: string; wordIds: string[] }>;

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
    if (run.length >= 2 && !lexicon.has(run)) return false;
  }
  return true;
}
