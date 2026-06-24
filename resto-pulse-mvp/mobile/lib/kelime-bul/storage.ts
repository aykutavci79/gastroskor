import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  KELIME_BUL_GUNLUK_UCRETSIZ,
  KELIME_BUL_LIMIT_DISABLED,
  KELIME_BUL_STORAGE_PREFIX,
} from '@/constants/kelime-bul';
import { activePuzzleId } from '@/lib/mini-sudoku/schedule';

import type { KelimeBulPuzzle } from './engine';

const GUEST_KEY = `${KELIME_BUL_STORAGE_PREFIX}:guest-plays`;
const GUEST_EXHAUSTED_KEY = `${KELIME_BUL_STORAGE_PREFIX}:guest-exhausted`;
const SESSION_KEY = `${KELIME_BUL_STORAGE_PREFIX}:session`;

export type KelimeBulGuestDaily = {
  periodId: string;
  playCount: number;
};

export type KelimeBulProgress = {
  puzzleId: string;
  periodId: string;
  grid: string[][];
  words: string[];
  foundWords: string[];
  startedAt: string;
  completedAt: string | null;
};

export type KelimeBulLobbyMeta = {
  inProgress: boolean;
  completed: boolean;
  freeRemaining: number | null;
  guestPlaysToday: number;
};

function isStringGrid(raw: unknown): raw is string[][] {
  return (
    Array.isArray(raw) &&
    raw.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === 'string'))
  );
}

export async function loadGuestDaily(periodId = activePuzzleId()): Promise<KelimeBulGuestDaily> {
  if (KELIME_BUL_LIMIT_DISABLED) {
    return { periodId, playCount: 0 };
  }
  try {
    const raw = await AsyncStorage.getItem(GUEST_KEY);
    if (!raw) return { periodId, playCount: 0 };
    const parsed = JSON.parse(raw) as KelimeBulGuestDaily;
    if (parsed.periodId !== periodId || typeof parsed.playCount !== 'number') {
      return { periodId, playCount: 0 };
    }
    return parsed;
  } catch {
    return { periodId, playCount: 0 };
  }
}

export async function saveGuestDaily(record: KelimeBulGuestDaily): Promise<void> {
  await AsyncStorage.setItem(GUEST_KEY, JSON.stringify(record));
}

export async function incrementGuestDaily(periodId = activePuzzleId()): Promise<KelimeBulGuestDaily> {
  const current = await loadGuestDaily(periodId);
  const next = { periodId, playCount: current.playCount + 1 };
  await saveGuestDaily(next);
  return next;
}

export async function clearGuestPlayCount(): Promise<void> {
  await AsyncStorage.removeItem(GUEST_KEY);
}

export async function clearGuestDaily(): Promise<void> {
  await AsyncStorage.multiRemove([GUEST_KEY, GUEST_EXHAUSTED_KEY]);
}

export async function isGuestExhausted(): Promise<boolean> {
  if (KELIME_BUL_LIMIT_DISABLED) return false;
  const raw = await AsyncStorage.getItem(GUEST_EXHAUSTED_KEY);
  return raw === '1';
}

export async function setGuestExhausted(value: boolean): Promise<void> {
  if (value) {
    await AsyncStorage.setItem(GUEST_EXHAUSTED_KEY, '1');
  } else {
    await AsyncStorage.removeItem(GUEST_EXHAUSTED_KEY);
  }
}

export async function loadKelimeBulSession(): Promise<KelimeBulProgress | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as KelimeBulProgress;
    if (
      typeof parsed.puzzleId !== 'string' ||
      typeof parsed.periodId !== 'string' ||
      !isStringGrid(parsed.grid) ||
      !Array.isArray(parsed.words) ||
      !Array.isArray(parsed.foundWords)
    ) {
      return null;
    }
    if (parsed.periodId !== activePuzzleId()) {
      await AsyncStorage.removeItem(SESSION_KEY);
      return null;
    }
    return {
      ...parsed,
      completedAt: parsed.completedAt ?? null,
    };
  } catch {
    return null;
  }
}

export async function saveKelimeBulSession(progress: KelimeBulProgress): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(progress));
}

export async function clearKelimeBulSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export function freshKelimeBulProgress(puzzle: KelimeBulPuzzle, periodId = activePuzzleId()): KelimeBulProgress {
  return {
    puzzleId: puzzle.puzzleId,
    periodId,
    grid: puzzle.grid,
    words: puzzle.words,
    foundWords: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
  };
}

export function guestFreeRemaining(playCount: number): number {
  return Math.max(0, KELIME_BUL_GUNLUK_UCRETSIZ - playCount);
}

const ACCOUNT_META_KEY = `${KELIME_BUL_STORAGE_PREFIX}:account-meta`;

export type KelimeBulAccountMeta = {
  periodId: string;
  freeRemaining: number;
};

export async function saveKelimeBulAccountMeta(meta: KelimeBulAccountMeta): Promise<void> {
  await AsyncStorage.setItem(ACCOUNT_META_KEY, JSON.stringify(meta));
}

export async function loadKelimeBulAccountMeta(periodId = activePuzzleId()): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(ACCOUNT_META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as KelimeBulAccountMeta;
    if (parsed.periodId !== periodId || typeof parsed.freeRemaining !== 'number') return null;
    return parsed.freeRemaining;
  } catch {
    return null;
  }
}

export async function loadKelimeBulLobbyMeta(
  opts: { accountFreeRemaining?: number | null } = {},
): Promise<KelimeBulLobbyMeta> {
  const session = await loadKelimeBulSession();
  const guest = await loadGuestDaily();

  return {
    inProgress: Boolean(session && !session.completedAt),
    completed: Boolean(session?.completedAt),
    freeRemaining: opts.accountFreeRemaining ?? null,
    guestPlaysToday: guest.playCount,
  };
}
