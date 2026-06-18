import type { Digit } from './constants';

export type Grid = number[][];

export type MiniSudokuPuzzle = {
  id: string;
  givens: Grid;
  solution: Grid;
};

export type MiniSudokuProgress = {
  puzzleId: string;
  values: Grid;
  notes: Digit[][][];
  completedAt: string | null;
  elapsedMs: number;
};
