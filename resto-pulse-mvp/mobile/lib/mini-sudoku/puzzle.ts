import { DIGITS, SIZE, TARGET_GIVENS } from './constants';
import { cloneGrid, emptyGrid, solveGrid, countSolutions } from './engine';
import { mulberry32, seedFromString, shuffled } from './rng';
import { activePuzzleId } from './schedule';
import type { Grid, MiniSudokuPuzzle } from './types';

/** @deprecated activePuzzleId kullan */
export function todayPuzzleId(now = new Date()): string {
  return activePuzzleId(now);
}

function generateSolution(rand: () => number): Grid {
  const grid = emptyGrid();
  const digitOrder = shuffled(DIGITS, rand).map(Number);
  if (!solveGrid(grid, digitOrder)) {
    throw new Error('Mini sudoku cozum uretilemedi.');
  }
  return grid;
}

function carvePuzzle(solution: Grid, rand: () => number, targetGivens: number): Grid {
  const puzzle = cloneGrid(solution);
  const positions = shuffled(
    Array.from({ length: SIZE * SIZE }, (_, i) => ({
      row: Math.floor(i / SIZE),
      col: i % SIZE,
    })),
    rand,
  );

  let givens = SIZE * SIZE;
  for (const { row, col } of positions) {
    if (givens <= targetGivens) break;
    const backup = puzzle[row]![col]!;
    puzzle[row]![col] = 0;
    const trial = cloneGrid(puzzle);
    if (countSolutions(trial, 2) === 1) {
      givens -= 1;
    } else {
      puzzle[row]![col] = backup;
    }
  }
  return puzzle;
}

export function buildDailyPuzzle(
  puzzleId = activePuzzleId(),
  targetGivens = TARGET_GIVENS,
): MiniSudokuPuzzle {
  const rand = mulberry32(seedFromString(`gastro-mini-sudoku:${puzzleId}`));
  const solution = generateSolution(rand);
  const givens = carvePuzzle(solution, rand, targetGivens);
  return { id: puzzleId, givens, solution };
}
