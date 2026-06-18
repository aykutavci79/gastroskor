import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_PREFIX } from './constants';
import { EGLENCE_GUNLUK_TEK_OYUN } from '@/constants/eglence-games';
import { cloneGrid, emptyNotes } from './engine';
import type { Grid, MiniSudokuProgress, MiniSudokuPuzzle } from './types';

const KEY = `${STORAGE_PREFIX}:progress`;

export function freshProgress(puzzle: MiniSudokuPuzzle): MiniSudokuProgress {
  return {
    puzzleId: puzzle.id,
    values: cloneGrid(puzzle.givens),
    notes: emptyNotes(),
    completedAt: null,
    elapsedMs: 0,
  };
}

function isGrid(raw: unknown): raw is Grid {
  return (
    Array.isArray(raw) &&
    raw.length === 6 &&
    raw.every((row) => Array.isArray(row) && row.length === 6 && row.every((n) => typeof n === 'number'))
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
    };
    if (!EGLENCE_GUNLUK_TEK_OYUN && progress.completedAt) {
      return freshProgress(puzzle);
    }
    return progress;
  } catch {
    return freshProgress(puzzle);
  }
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
): Promise<{ completed: boolean; inProgress: boolean }> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { completed: false, inProgress: false };
    const parsed = JSON.parse(raw) as MiniSudokuProgress;
    if (!parsed.puzzleId.startsWith(puzzleId)) return { completed: false, inProgress: false };
    return {
      completed: EGLENCE_GUNLUK_TEK_OYUN && parsed.completedAt != null,
      inProgress:
        parsed.completedAt == null &&
        (parsed.elapsedMs > 0 || notesTouched(parsed.notes)),
    };
  } catch {
    return { completed: false, inProgress: false };
  }
}
