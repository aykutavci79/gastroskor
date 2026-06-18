import AsyncStorage from '@react-native-async-storage/async-storage';

import { SOFRA_STORAGE_PREFIX } from '@/constants/kelime-sofrasi';
import { baslangicCarkSirasi } from '@/lib/kelime-sofrasi/engine';
import { mulberry32, seedFromString } from '@/lib/mini-sudoku/rng';

import type { SofraProgress, SofraPuzzle } from './types';

const KEY = `${SOFRA_STORAGE_PREFIX}:progress`;

export function freshProgress(puzzle: SofraPuzzle): SofraProgress {
  const rand = mulberry32(seedFromString(`${puzzle.id}:wheel`));
  return {
    puzzleId: puzzle.id,
    foundWordIds: [],
    wheelOrder: baslangicCarkSirasi(puzzle.wheel, rand),
    completedAt: null,
    elapsedMs: 0,
  };
}

export async function loadSofraProgress(puzzle: SofraPuzzle): Promise<SofraProgress> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return freshProgress(puzzle);
    const parsed = JSON.parse(raw) as SofraProgress;
    if (parsed.puzzleId !== puzzle.id || !Array.isArray(parsed.foundWordIds)) {
      return freshProgress(puzzle);
    }
    const wheelOrder =
      Array.isArray(parsed.wheelOrder) && parsed.wheelOrder.length === puzzle.wheel.length
        ? parsed.wheelOrder
        : freshProgress(puzzle).wheelOrder;
    return {
      puzzleId: parsed.puzzleId,
      foundWordIds: parsed.foundWordIds,
      wheelOrder,
      completedAt: parsed.completedAt ?? null,
      elapsedMs: typeof parsed.elapsedMs === 'number' ? parsed.elapsedMs : 0,
    };
  } catch {
    return freshProgress(puzzle);
  }
}

export async function saveSofraProgress(progress: SofraProgress): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(progress));
}
