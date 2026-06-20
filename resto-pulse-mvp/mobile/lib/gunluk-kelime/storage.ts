import AsyncStorage from '@react-native-async-storage/async-storage';

import { GUNLUK_KELIME_LENGTH, GUNLUK_KELIME_STORAGE_PREFIX } from '@/constants/gunluk-kelime';
import { EGLENCE_GUNLUK_TEK_OYUN } from '@/constants/eglence-games';
import { sofraKelimeBuyuk } from '@/lib/kelime-sofrasi/turkce-harf';

import { gunlukKelimeCevabi } from './daily';
import type { GunlukKelimeGuessRow, GunlukKelimeProgress } from './types';

const KEY = `${GUNLUK_KELIME_STORAGE_PREFIX}:progress`;

function isValidAnswer(answer: string): boolean {
  return sofraKelimeBuyuk(answer).length === GUNLUK_KELIME_LENGTH;
}

export function freshGunlukKelimeProgress(puzzleId: string): GunlukKelimeProgress {
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
    if (!raw) return freshGunlukKelimeProgress(puzzleId);
    const parsed = JSON.parse(raw) as GunlukKelimeProgress;
    if (parsed.puzzleId !== puzzleId || typeof parsed.answer !== 'string' || !isValidAnswer(parsed.answer)) {
      return freshGunlukKelimeProgress(puzzleId);
    }
    if (!Array.isArray(parsed.guesses) || !parsed.guesses.every(isGuessRow)) {
      return freshGunlukKelimeProgress(puzzleId);
    }
    if (!EGLENCE_GUNLUK_TEK_OYUN && parsed.completedAt) {
      return freshGunlukKelimeProgress(puzzleId);
    }
    return {
      puzzleId: parsed.puzzleId,
      answer: parsed.answer,
      guesses: parsed.guesses,
      completedAt: parsed.completedAt ?? null,
      won: Boolean(parsed.won),
    };
  } catch {
    return freshGunlukKelimeProgress(puzzleId);
  }
}

export async function saveGunlukKelimeProgress(progress: GunlukKelimeProgress): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(progress));
}

export async function loadGunlukKelimeMetaStatus(
  puzzleId: string,
): Promise<{ completed: boolean; inProgress: boolean }> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { completed: false, inProgress: false };
    const parsed = JSON.parse(raw) as GunlukKelimeProgress;
    if (parsed.puzzleId !== puzzleId) return { completed: false, inProgress: false };
    return {
      completed: EGLENCE_GUNLUK_TEK_OYUN && parsed.completedAt != null,
      inProgress: parsed.completedAt == null && parsed.guesses.length > 0,
    };
  } catch {
    return { completed: false, inProgress: false };
  }
}
