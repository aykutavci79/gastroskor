import { BOX_COLS, BOX_ROWS, DIGITS, SIZE, type Digit } from './constants';
import type { Grid } from './types';

export function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

export function gridsEqual(a: Grid, b: Grid): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (a[r]![c] !== b[r]![c]) return false;
    }
  }
  return true;
}

export function isGiven(givens: Grid, row: number, col: number): boolean {
  return givens[row]![col]! > 0;
}

export function isValidPlacement(grid: Grid, row: number, col: number, value: number): boolean {
  if (value < 1 || value > SIZE) return false;
  for (let c = 0; c < SIZE; c++) {
    if (c !== col && grid[row]![c] === value) return false;
  }
  for (let r = 0; r < SIZE; r++) {
    if (r !== row && grid[r]![col] === value) return false;
  }
  const boxRow = Math.floor(row / BOX_ROWS) * BOX_ROWS;
  const boxCol = Math.floor(col / BOX_COLS) * BOX_COLS;
  for (let r = boxRow; r < boxRow + BOX_ROWS; r++) {
    for (let c = boxCol; c < boxCol + BOX_COLS; c++) {
      if ((r !== row || c !== col) && grid[r]![c] === value) return false;
    }
  }
  return true;
}

export function findEmpty(grid: Grid): { row: number; col: number } | null {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r]![c] === 0) return { row: r, col: c };
    }
  }
  return null;
}

export function solveGrid(grid: Grid, digitOrder: readonly number[] = DIGITS): boolean {
  const empty = findEmpty(grid);
  if (!empty) return true;
  const { row, col } = empty;
  for (const digit of digitOrder) {
    if (!isValidPlacement(grid, row, col, digit)) continue;
    grid[row]![col] = digit;
    if (solveGrid(grid, digitOrder)) return true;
    grid[row]![col] = 0;
  }
  return false;
}

export function countSolutions(grid: Grid, limit = 2): number {
  const empty = findEmpty(grid);
  if (!empty) return 1;
  const { row, col } = empty;
  let count = 0;
  for (const digit of DIGITS) {
    if (!isValidPlacement(grid, row, col, digit)) continue;
    grid[row]![col] = digit;
    count += countSolutions(grid, limit);
    grid[row]![col] = 0;
    if (count >= limit) return count;
  }
  return count;
}

export function hasConflict(grid: Grid, row: number, col: number): boolean {
  const value = grid[row]![col]!;
  if (value === 0) return false;
  for (let c = 0; c < SIZE; c++) {
    if (c !== col && grid[row]![c] === value) return true;
  }
  for (let r = 0; r < SIZE; r++) {
    if (r !== row && grid[r]![col] === value) return true;
  }
  const boxRow = Math.floor(row / BOX_ROWS) * BOX_ROWS;
  const boxCol = Math.floor(col / BOX_COLS) * BOX_COLS;
  for (let r = boxRow; r < boxRow + BOX_ROWS; r++) {
    for (let c = boxCol; c < boxCol + BOX_COLS; c++) {
      if ((r !== row || c !== col) && grid[r]![c] === value) return true;
    }
  }
  return false;
}

export function isComplete(grid: Grid): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const value = grid[r]![c]!;
      if (value === 0 || hasConflict(grid, r, c)) return false;
    }
  }
  return true;
}

export function isSolved(grid: Grid, solution: Grid): boolean {
  return isComplete(grid) && gridsEqual(grid, solution);
}

export function emptyNotes(): Digit[][][] {
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => [] as Digit[]),
  );
}

export function toggleNote(notes: Digit[][][], row: number, col: number, digit: Digit): Digit[][][] {
  const next = notes.map((r, ri) =>
    r.map((cell, ci) => {
      if (ri !== row || ci !== col) return [...cell];
      return cell.includes(digit) ? cell.filter((d) => d !== digit) : [...cell, digit].sort();
    }),
  );
  return next;
}

function countDigitOnGrid(grid: Grid, digit: Digit): number {
  let count = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r]![c] === digit) count += 1;
    }
  }
  return count;
}

export function remainingDigitCounts(solution: Grid, values: Grid): Record<Digit, number> {
  const counts = {} as Record<Digit, number>;
  for (const digit of DIGITS) {
    counts[digit] = Math.max(0, countDigitOnGrid(solution, digit) - countDigitOnGrid(values, digit));
  }
  return counts;
}

export function isWrongPlacement(solution: Grid, row: number, col: number, digit: Digit): boolean {
  return solution[row]![col] !== digit;
}

export function countEmptyCells(grid: Grid): number {
  let count = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r]![c] === 0) count += 1;
    }
  }
  return count;
}

/** Dolu hücreler çözümle uyumlu mu (yanlış rakam yok). */
export function filledCellsMatchSolution(values: Grid, solution: Grid): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const value = values[r]![c]!;
      if (value > 0 && value !== solution[r]![c]) return false;
    }
  }
  return true;
}

/** Boş hücreleri çözümle doldurur; notları temizler. */
export function autoCompleteFromSolution(
  values: Grid,
  notes: Digit[][][],
  solution: Grid,
): { values: Grid; notes: Digit[][][] } {
  const nextValues = cloneGrid(values);
  const nextNotes = notes.map((row) => row.map((cell) => [...cell]));
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (nextValues[r]![c] === 0) {
        nextValues[r]![c] = solution[r]![c]!;
        nextNotes[r]![c] = [];
      }
    }
  }
  return { values: nextValues, notes: nextNotes };
}
