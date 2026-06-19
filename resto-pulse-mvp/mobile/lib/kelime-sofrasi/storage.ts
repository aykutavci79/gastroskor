import AsyncStorage from '@react-native-async-storage/async-storage';

import { SOFRA_STORAGE_PREFIX } from '@/constants/kelime-sofrasi';
import { baslangicCarkSirasi } from '@/lib/kelime-sofrasi/engine';
import {
  sofraGunlukLimitDoldu,
  sofraKalanGunlukHak,
  sofraTamamlamaSayisi,
} from '@/lib/kelime-sofrasi/sofra-gunluk-limit';
import { mulberry32, seedFromString } from '@/lib/mini-sudoku/rng';

import type { SofraProgress, SofraPuzzle } from './types';

const KEY = `${SOFRA_STORAGE_PREFIX}:progress`;

/** Oyun acilisinda AsyncStorage beklemesini keser — lobi/oyun warm ile dolar. */
const progressMemCache = new Map<string, SofraProgress>();

function progressCacheKey(puzzle: SofraPuzzle): string {
  return puzzle.id;
}

export function getCachedSofraProgress(puzzle: SofraPuzzle): SofraProgress | null {
  return progressMemCache.get(progressCacheKey(puzzle)) ?? null;
}

/** Lobi / buton onPressIn — kayitli ilerlemeyi bellege alir. */
export function warmSofraProgress(puzzle: SofraPuzzle): void {
  const key = progressCacheKey(puzzle);
  if (progressMemCache.has(key)) return;
  void loadSofraProgress(puzzle).then((saved) => {
    progressMemCache.set(key, saved);
  });
}

export function freshProgress(
  puzzle: SofraPuzzle,
  opts?: { gunlukTamamlamaSayisi?: number },
): SofraProgress {
  const rand = mulberry32(seedFromString(`${puzzle.id}:wheel`));
  return {
    puzzleId: puzzle.id,
    foundWordIds: [],
    bonusFound: [],
    hintedCells: [],
    wheelOrder: baslangicCarkSirasi(puzzle.wheel, rand),
    completedAt: null,
    elapsedMs: 0,
    gunlukTamamlamaSayisi: opts?.gunlukTamamlamaSayisi ?? 0,
  };
}

export async function loadSofraProgress(puzzle: SofraPuzzle): Promise<SofraProgress> {
  const store = (progress: SofraProgress) => {
    progressMemCache.set(progressCacheKey(puzzle), progress);
    return progress;
  };
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return store(freshProgress(puzzle));
    const parsed = JSON.parse(raw) as SofraProgress;
    if (parsed.puzzleId !== puzzle.id || !Array.isArray(parsed.foundWordIds)) {
      return store(freshProgress(puzzle));
    }
    const wheelOrder =
      Array.isArray(parsed.wheelOrder) && parsed.wheelOrder.length === puzzle.wheel.length
        ? parsed.wheelOrder
        : freshProgress(puzzle).wheelOrder;
    const tamamlama = sofraTamamlamaSayisi(parsed);
    const progress: SofraProgress = {
      puzzleId: parsed.puzzleId,
      foundWordIds: parsed.foundWordIds,
      bonusFound: Array.isArray(parsed.bonusFound) ? parsed.bonusFound : [],
      hintedCells: Array.isArray(parsed.hintedCells)
        ? parsed.hintedCells
        : Array.isArray(parsed.hintedWordIds)
          ? []
          : [],
      wheelOrder,
      completedAt: parsed.completedAt ?? null,
      elapsedMs: typeof parsed.elapsedMs === 'number' ? parsed.elapsedMs : 0,
      gunlukTamamlamaSayisi: tamamlama,
    };
    if (progress.completedAt && !sofraGunlukLimitDoldu(progress)) {
      return store(
        freshProgress(puzzle, { gunlukTamamlamaSayisi: tamamlama }),
      );
    }
    return store(progress);
  } catch {
    return store(freshProgress(puzzle));
  }
}

export async function saveSofraProgress(progress: SofraProgress): Promise<void> {
  progressMemCache.set(progress.puzzleId, progress);
  await AsyncStorage.setItem(KEY, JSON.stringify(progress));
}

/** Eğlence sekmesi / lobi için — ağır bulmaca üretimi olmadan durum okur. */
export async function loadSofraMetaStatus(
  puzzleId: string,
): Promise<{
  completed: boolean;
  inProgress: boolean;
  tamamlamaSayisi: number;
  kalanTur: number;
}> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      return { completed: false, inProgress: false, tamamlamaSayisi: 0, kalanTur: sofraKalanGunlukHak(null) };
    }
    const parsed = JSON.parse(raw) as SofraProgress;
    if (!parsed.puzzleId.startsWith(puzzleId)) {
      return { completed: false, inProgress: false, tamamlamaSayisi: 0, kalanTur: sofraKalanGunlukHak(null) };
    }
    const tamamlama = sofraTamamlamaSayisi(parsed);
    const progress = { ...parsed, gunlukTamamlamaSayisi: tamamlama };
    const limitDoldu = sofraGunlukLimitDoldu(progress);
    return {
      completed: limitDoldu,
      inProgress: !limitDoldu && parsed.completedAt == null && parsed.foundWordIds.length > 0,
      tamamlamaSayisi: tamamlama,
      kalanTur: sofraKalanGunlukHak(progress),
    };
  } catch {
    return { completed: false, inProgress: false, tamamlamaSayisi: 0, kalanTur: sofraKalanGunlukHak(null) };
  }
}
