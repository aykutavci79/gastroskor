/**
 * Mini sudoku motoru — Node ile hizli dogrulama.
 * Calistir: npx tsx mobile/scripts/verify-mini-sudoku.ts
 */
import { countSolutions, solveGrid } from '../lib/mini-sudoku/engine';
import { buildDailyPuzzle, todayPuzzleId } from '../lib/mini-sudoku/puzzle';

function countGivens(givens: number[][]) {
  return givens.flat().filter((n) => n > 0).length;
}

const id = todayPuzzleId();
const puzzle = buildDailyPuzzle(id);
const trial = puzzle.givens.map((row) => [...row]);

if (!solveGrid(trial)) {
  console.error('FAIL: verilen bulmaca cozulemedi');
  process.exit(1);
}

const solutions = countSolutions(puzzle.givens.map((row) => [...row]), 2);
if (solutions !== 1) {
  console.error(`FAIL: tek cozum bekleniyordu, bulunan=${solutions}`);
  process.exit(1);
}

const givens = countGivens(puzzle.givens);
console.log(`OK ${id} — givens=${givens}, solutions=1`);
