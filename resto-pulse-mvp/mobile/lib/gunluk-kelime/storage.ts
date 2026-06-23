import AsyncStorage from '@react-native-async-storage/async-storage';

import { GUNLUK_KELIME_LENGTH, GUNLUK_KELIME_STORAGE_PREFIX } from '@/constants/gunluk-kelime';
import { EGLENCE_GUNLUK_TEK_OYUN } from '@/constants/eglence-games';
import { sofraKelimeBuyuk } from '@/lib/kelime-sofrasi/turkce-harf';

import type { GunlukKelimeGuessRow, GunlukKelimeProgress } from './types';

const KEY = `${GUNLUK_KELIME_STORAGE_PREFIX}:progress`;
const DAILY_KEY = `${GUNLUK_KELIME_STORAGE_PREFIX}:daily-record`;

export type GunlukKelimeDailyRecord = {
  puzzleId: string;
  completedAt: string;
  score: number;
  won: boolean;
  guessCount: number;
};

function isValidAnswer(answer: string): boolean {
  return sofraKelimeBuyuk(answer).length === GUNLUK_KELIME_LENGTH;
}

export async function freshGunlukKelimeProgress(puzzleId: string): Promise<GunlukKelimeProgress> {
  const { gunlukKelimeCevabi } = await import('./daily');
  return {
    puzzleId,
    answer: gunlukKelimeCevabi(puzzleId),
    guesses: [],
    completedAt: null,
    won: false,
  };
}

function isGuessRow(raw: unknown): raw is GunlukKelimeGuessRow {
  if (!raw || typeof raw !== 'object') return false;
  const row = raw as GunlukKelimeGuessRow;
  return typeof row.word === 'string' && Array.isArray(row.states);
}

export async function loadGunlukKelimeProgress(
  puzzleId: string,
): Promise<GunlukKelimeProgress> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return await freshGunlukKelimeProgress(puzzleId);
    const parsed = JSON.parse(raw) as GunlukKelimeProgress;
    if (parsed.puzzleId !== puzzleId || typeof parsed.answer !== 'string' || !isValidAnswer(parsed.answer)) {
      return await freshGunlukKelimeProgress(puzzleId);
    }
    if (!Array.isArray(parsed.guesses) || !parsed.guesses.every(isGuessRow)) {
      return await freshGunlukKelimeProgress(puzzleId);
    }
    if (!EGLENCE_GUNLUK_TEK_OYUN && parsed.completedAt) {
      return await freshGunlukKelimeProgress(puzzleId);
    }
    return {
      puzzleId: parsed.puzzleId,
      answer: parsed.answer,
      guesses: parsed.guesses,
      completedAt: parsed.completedAt ?? null,
      won: Boolean(parsed.won),
    };
  } catch {
    return await freshGunlukKelimeProgress(puzzleId);
  }
}

export async function saveGunlukKelimeDailyRecord(record: GunlukKelimeDailyRecord): Promise<void> {
  await AsyncStorage.setItem(DAILY_KEY, JSON.stringify(record));
}

export async function loadGunlukKelimeDailyRecord(
  puzzleId: string,
): Promise<GunlukKelimeDailyRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GunlukKelimeDailyRecord;
    if (parsed.puzzleId !== puzzleId || typeof parsed.score !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function resetGunlukKelimeSession(puzzleId: string): Promise<GunlukKelimeProgress> {
  const fresh = await freshGunlukKelimeProgress(puzzleId);
  await saveGunlukKelimeProgress(fresh);
  return fresh;
}

export async function saveGunlukKelimeProgress(progress: GunlukKelimeProgress): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(progress));
}

export async function loadGunlukKelimeMetaStatus(
  puzzleId: string,
): Promise<{ completed: boolean; inProgress: boolean; score?: number }> {
  try {
    const daily = await loadGunlukKelimeDailyRecord(puzzleId);
    if (daily) {
      return {
        completed: EGLENCE_GUNLUK_TEK_OYUN,
        inProgress: false,
        score: daily.score,
      };
    }
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { completed: false, inProgress: false };
    const parsed = JSON.parse(raw) as GunlukKelimeProgress;
    if (parsed.puzzleId !== puzzleId) return { completed: false, inProgress: false };
    const finished = parsed.completedAt != null;
    return {
      completed: finished && EGLENCE_GUNLUK_TEK_OYUN,
      inProgress: !finished && parsed.guesses.length > 0,
    };
  } catch {
    return { completed: false, inProgress: false };
  }
}
