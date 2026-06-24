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

const LEGACY_KEY = `${SOFRA_STORAGE_PREFIX}:progress`;

function progressStorageKey(gunId: string, zorluk: EglenceZorluk): string {
  return `${SOFRA_STORAGE_PREFIX}:progress:${gunId}:${zorluk}`;
}

/** Oyun acilisinda AsyncStorage beklemesini keser — lobi/oyun warm ile dolar. */
const progressMemCache = new Map<string, SofraProgress>();

function progressCacheKey(puzzle: SofraPuzzle): string {
  return puzzle.id;
}

function memKey(gunId: string, zorluk: EglenceZorluk): string {
  return `${gunId}:${zorluk}`;
}

async function readStoredProgress(
  gunId: string,
  zorluk: EglenceZorluk,
): Promise<SofraProgress | null> {
  const key = progressStorageKey(gunId, zorluk);
  let raw = await AsyncStorage.getItem(key);
  if (raw) return JSON.parse(raw) as SofraProgress;

  raw = await AsyncStorage.getItem(LEGACY_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as SofraProgress;
  const prefix = `${gunId}:${zorluk}`;
  if (!parsed.puzzleId.startsWith(prefix)) return null;
  await AsyncStorage.setItem(key, raw);
  await AsyncStorage.removeItem(LEGACY_KEY);
  return parsed;
}

export function getCachedSofraProgress(puzzle: SofraPuzzle): SofraProgress | null {
  return progressMemCache.get(progressCacheKey(puzzle)) ?? null;
}

/** Lobi / buton onPressIn — kayitli ilerlemeyi bellege alir. */
export function warmSofraProgress(puzzle: SofraPuzzle): void {
  const key = progressCacheKey(puzzle);
  if (progressMemCache.has(key)) return;
  const gunParts = puzzle.id.split(':');
  const gunId = gunParts[0] ?? '';
  const zorluk = (gunParts[1] ?? 'orta') as EglenceZorluk;
  void loadSofraProgress(puzzle, gunId, zorluk).then((saved) => {
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
  gunId?: string,
  zorluk?: EglenceZorluk,
): Promise<SofraProgress> {
  const next = freshProgress(puzzle, { gunlukTamamlamaSayisi: tamamlamaSayisi });
  await saveSofraProgress(next, gunId, zorluk);
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
    const parsed = await readStoredProgress(gunId, zorluk);
    if (!parsed) return 0;
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
  const resolvedGunId = gunId ?? puzzle.id.split(':')[0] ?? '';
  const resolvedZorluk = zorluk ?? ((puzzle.id.split(':')[1] ?? 'orta') as EglenceZorluk);
  const store = (progress: SofraProgress) => {
    progressMemCache.set(progressCacheKey(puzzle), progress);
    progressMemCache.set(memKey(resolvedGunId, resolvedZorluk), progress);
    return progress;
  };
  const defaultTamamlama = turTamamlamaSayisi(puzzle, resolvedGunId, resolvedZorluk);
  try {
    const parsed = await readStoredProgress(resolvedGunId, resolvedZorluk);
    if (!parsed) {
      return store(freshProgress(puzzle, { gunlukTamamlamaSayisi: defaultTamamlama }));
    }
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
      await saveSofraProgress(next, resolvedGunId, resolvedZorluk);
      return store(next);
    }
    return store(progress);
  } catch {
    return store(freshProgress(puzzle, { gunlukTamamlamaSayisi: defaultTamamlama }));
  }
}

export async function saveSofraProgress(
  progress: SofraProgress,
  gunId?: string,
  zorluk?: EglenceZorluk,
): Promise<void> {
  progressMemCache.set(progress.puzzleId, progress);
  const parts = progress.puzzleId.split(':');
  const resolvedGunId = gunId ?? parts[0] ?? '';
  const resolvedZorluk = zorluk ?? ((parts[1] ?? 'orta') as EglenceZorluk);
  progressMemCache.set(memKey(resolvedGunId, resolvedZorluk), progress);
  await AsyncStorage.setItem(
    progressStorageKey(resolvedGunId, resolvedZorluk),
    JSON.stringify(progress),
  );
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
    const parsed = await readStoredProgress(gunId, zorluk);
    if (!parsed) {
      return { completed: false, inProgress: false, tamamlamaSayisi: 0, kalanTur: sofraKalanGunlukHak(null) };
    }
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
