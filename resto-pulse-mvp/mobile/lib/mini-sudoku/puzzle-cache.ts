import { buildDailyPuzzle } from '@/lib/mini-sudoku/puzzle';
import { activePuzzleId } from '@/lib/mini-sudoku/schedule';

import {
  SUDOKU_9X9_GIVENS,
  sudokuPuzzleKey,
  type EglenceZorluk,
} from '@/constants/eglence-zorluk';

import type { MiniSudokuPuzzle } from './types';

const cache = new Map<string, MiniSudokuPuzzle>();

/** Günlük sudoku bir kez üretilir (seviye başına), sonra bellekten döner. */
export function getDailyPuzzle(
  gunId = activePuzzleId(),
  zorluk: 'kolay' | 'orta' | 'zor' = 'orta',
): MiniSudokuPuzzle {
  const puzzleId = sudokuPuzzleKey(gunId, zorluk);
  const hit = cache.get(puzzleId);
  if (hit) return hit;
  const built = buildDailyPuzzle(puzzleId, SUDOKU_9X9_GIVENS[zorluk]);
  cache.set(puzzleId, built);
  return built;
}

/** @deprecated getDailyPuzzle(gunId, zorluk) kullan */
export function getDailyPuzzleById(puzzleId: string): MiniSudokuPuzzle {
  const hit = cache.get(puzzleId);
  if (hit) return hit;
  const built = buildDailyPuzzle(puzzleId);
  cache.set(puzzleId, built);
  return built;
}

export function sudokuZorlukFromPuzzleId(puzzleId: string): 'kolay' | 'orta' | 'zor' {
  if (puzzleId.includes(':sudoku:kolay')) return 'kolay';
  if (puzzleId.includes(':sudoku:zor')) return 'zor';
  return 'orta';
}

export function isSudokuZorluk(z: EglenceZorluk): z is 'kolay' | 'orta' | 'zor' {
  return z === 'kolay' || z === 'orta' || z === 'zor';
}
