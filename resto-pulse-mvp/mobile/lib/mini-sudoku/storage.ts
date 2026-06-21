import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_PREFIX, SIZE, SUDOKU_MAX_HINTS, SUDOKU_MAX_LIVES } from './constants';
import { EGLENCE_GUNLUK_TEK_OYUN } from '@/constants/eglence-games';
import { cloneGrid, emptyNotes } from './engine';
import type { Grid, MiniSudokuProgress, MiniSudokuPuzzle } from './types';

const KEY = `${STORAGE_PREFIX}:progress`;
const DAILY_KEY = `${STORAGE_PREFIX}:daily-record`;

export type SudokuDailyRecord = {
  puzzleId: string;
  completedAt: string;
  elapsedMs: number;
  score: number;
};

export function freshProgress(puzzle: MiniSudokuPuzzle): MiniSudokuProgress {
  return {
    puzzleId: puzzle.id,
    values: cloneGrid(puzzle.givens),
    notes: emptyNotes(),
    completedAt: null,
    elapsedMs: 0,
    lives: SUDOKU_MAX_LIVES,
    hintsRemaining: SUDOKU_MAX_HINTS,
    gameOver: false,
  };
}

function isGrid(raw: unknown): raw is Grid {
  return (
    Array.isArray(raw) &&
    raw.length === SIZE &&
    raw.every((row) => Array.isArray(row) && row.length === SIZE && row.every((n) => typeof n === 'number'))
  );
}

export async function loadProgress(puzzle: MiniSudokuPuzzle): Promise<MiniSudokuProgress> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return freshProgress(puzzle);
    const parsed = JSON.parse(raw) as MiniSudokuProgress;
    if (parsed.puzzleId !== puzzle.id || !isGrid(parsed.values)) {
      return freshProgress(puzzle);
    }
    const progress: MiniSudokuProgress = {
      puzzleId: parsed.puzzleId,
      values: cloneGrid(parsed.values),
      notes: parsed.notes ?? emptyNotes(),
      completedAt: parsed.completedAt ?? null,
      elapsedMs: typeof parsed.elapsedMs === 'number' ? parsed.elapsedMs : 0,
      lives: typeof parsed.lives === 'number' ? parsed.lives : SUDOKU_MAX_LIVES,
      hintsRemaining:
        typeof parsed.hintsRemaining === 'number' ? parsed.hintsRemaining : SUDOKU_MAX_HINTS,
      gameOver: parsed.gameOver === true,
    };
    if (!EGLENCE_GUNLUK_TEK_OYUN && progress.completedAt) {
      return freshProgress(puzzle);
    }
    return progress;
  } catch {
    return freshProgress(puzzle);
  }
}

export async function saveSudokuDailyRecord(record: SudokuDailyRecord): Promise<void> {
  await AsyncStorage.setItem(DAILY_KEY, JSON.stringify(record));
}

export async function loadSudokuDailyRecord(puzzleId: string): Promise<SudokuDailyRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SudokuDailyRecord;
    if (!parsed.puzzleId.startsWith(puzzleId) || typeof parsed.score !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function resetSudokuSession(puzzle: MiniSudokuPuzzle): Promise<MiniSudokuProgress> {
  const fresh = freshProgress(puzzle);
  await saveProgress(fresh);
  return fresh;
}

export async function saveProgress(progress: MiniSudokuProgress): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(progress));
}

export async function clearProgress(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

function notesTouched(notes: MiniSudokuProgress['notes'] | undefined): boolean {
  return notes?.some((row) => row.some((cell) => cell.length > 0)) ?? false;
}

/** Eğlence sekmesi için — bulmaca üretmeden durum okur. */
export async function loadSudokuMetaStatus(
  puzzleId: string,
): Promise<{ completed: boolean; inProgress: boolean; score?: number }> {
  try {
    const daily = await loadSudokuDailyRecord(puzzleId);
    if (daily) {
      return {
        completed: EGLENCE_GUNLUK_TEK_OYUN,
        inProgress: false,
        score: daily.score,
      };
    }
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { completed: false, inProgress: false };
    const parsed = JSON.parse(raw) as MiniSudokuProgress;
    if (!parsed.puzzleId.startsWith(puzzleId)) return { completed: false, inProgress: false };
    return {
      completed: false,
      inProgress:
        parsed.completedAt == null &&
        (parsed.elapsedMs > 0 || notesTouched(parsed.notes) || parsed.gameOver),
    };
  } catch {
    return { completed: false, inProgress: false };
  }
}
