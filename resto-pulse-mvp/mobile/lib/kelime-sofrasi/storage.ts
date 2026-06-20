import AsyncStorage from '@react-native-async-storage/async-storage';

import type { EglenceZorluk } from '@/constants/eglence-zorluk';
import { sofraTurFromPuzzleId } from '@/constants/eglence-zorluk';
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
  const round = opts?.gunlukTamamlamaSayisi ?? 0;
  const rand = mulberry32(seedFromString(`${puzzle.id}:wheel:round:${round}`));
  return {
    puzzleId: puzzle.id,
    foundWordIds: [],
    bonusFound: [],
    hintedCells: [],
    wheelOrder: baslangicCarkSirasi(puzzle.wheel, rand),
    completedAt: null,
    elapsedMs: 0,
    gunlukTamamlamaSayisi: round,
  };
}

/** Tamamlanan tur sonrası yeni tur — diske yazar, bellek önbelleğini günceller. */
export async function beginNextSofraRound(
  puzzle: SofraPuzzle,
  tamamlamaSayisi: number,
): Promise<SofraProgress> {
  const next = freshProgress(puzzle, { gunlukTamamlamaSayisi: tamamlamaSayisi });
  await saveSofraProgress(next);
  return next;
}

function turTamamlamaSayisi(puzzle: SofraPuzzle, gunId: string, zorluk: EglenceZorluk): number {
  return sofraTurFromPuzzleId(puzzle.id, gunId, zorluk);
}

/** Kayitli ilerlemeye gore hangi tur bulmacasi yuklenecek. */
export async function resolveSofraSessionTur(
  gunId: string,
  zorluk: EglenceZorluk,
): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as SofraProgress;
    const prefix = `${gunId}:${zorluk}`;
    if (!parsed.puzzleId.startsWith(prefix)) return 0;
    if (parsed.completedAt && !sofraGunlukLimitDoldu(parsed)) {
      return sofraTamamlamaSayisi(parsed);
    }
    return sofraTurFromPuzzleId(parsed.puzzleId, gunId, zorluk);
  } catch {
    return 0;
  }
}

export async function loadSofraProgress(
  puzzle: SofraPuzzle,
  gunId?: string,
  zorluk?: EglenceZorluk,
): Promise<SofraProgress> {
  const store = (progress: SofraProgress) => {
    progressMemCache.set(progressCacheKey(puzzle), progress);
    return progress;
  };
  const defaultTamamlama =
    gunId && zorluk ? turTamamlamaSayisi(puzzle, gunId, zorluk) : 0;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return store(freshProgress(puzzle, { gunlukTamamlamaSayisi: defaultTamamlama }));
    const parsed = JSON.parse(raw) as SofraProgress;
    if (parsed.puzzleId !== puzzle.id || !Array.isArray(parsed.foundWordIds)) {
      return store(freshProgress(puzzle, { gunlukTamamlamaSayisi: defaultTamamlama }));
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
      const next = freshProgress(puzzle, { gunlukTamamlamaSayisi: tamamlama });
      await saveSofraProgress(next);
      return store(next);
    }
    return store(progress);
  } catch {
    return store(freshProgress(puzzle, { gunlukTamamlamaSayisi: defaultTamamlama }));
  }
}

export async function saveSofraProgress(progress: SofraProgress): Promise<void> {
  progressMemCache.set(progress.puzzleId, progress);
  await AsyncStorage.setItem(KEY, JSON.stringify(progress));
}

/** Eğlence sekmesi / lobi için — ağır bulmaca üretimi olmadan durum okur. */
export async function loadSofraMetaStatus(
  gunId: string,
  zorluk: EglenceZorluk,
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
    const prefix = `${gunId}:${zorluk}`;
    if (!parsed.puzzleId.startsWith(prefix)) {
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
