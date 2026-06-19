import { Asset } from 'expo-asset';
import { InteractionManager } from 'react-native';

import type { EglenceZorluk } from '@/constants/eglence-zorluk';
import { sofraBackgroundForPuzzle } from '@/constants/regional-flavor-images';
import { buildDailySofraPuzzle, buildDailySofraPuzzleAsync } from '@/lib/kelime-sofrasi/puzzle';
import {
  loadSofraPuzzleFromDisk,
  saveSofraPuzzleToDisk,
  SOFRA_PUZZLE_DISK_VERSION,
} from '@/lib/kelime-sofrasi/puzzle-disk-cache';
import { warmSofraProgress } from '@/lib/kelime-sofrasi/storage';
import { activePuzzleId } from '@/lib/mini-sudoku/schedule';

import type { SofraPuzzle } from './types';

const CACHE_VERSION = SOFRA_PUZZLE_DISK_VERSION;
const cache = new Map<string, SofraPuzzle>();
const inflight = new Map<string, Promise<SofraPuzzle>>();
let prefetchTask: { cancel?: () => void } | null = null;
let prefetchChain: Promise<void> = Promise.resolve();

const ZORLUKLAR: EglenceZorluk[] = ['orta', 'kolay', 'zor'];

function cacheKey(gunId: string, zorluk: EglenceZorluk): string {
  return `${gunId}:${zorluk}:v${CACHE_VERSION}`;
}

function puzzleReady(puzzle: SofraPuzzle): void {
  warmSofraProgress(puzzle);
  scheduleBackgroundPrefetch(puzzle.id);
}

/** Günlük bulmaca — bellek önbelleği (senkron, test/script). */
export function getDailySofraPuzzle(
  gunId = activePuzzleId(),
  zorluk: EglenceZorluk = 'orta',
): SofraPuzzle {
  const key = cacheKey(gunId, zorluk);
  const hit = cache.get(key);
  if (hit) return hit;
  const built = buildDailySofraPuzzle(gunId, zorluk);
  cache.set(key, built);
  saveSofraPuzzleToDisk(gunId, zorluk, built);
  return built;
}

export function isSofraPuzzleCached(
  gunId = activePuzzleId(),
  zorluk: EglenceZorluk = 'orta',
): boolean {
  return cache.has(cacheKey(gunId, zorluk));
}

async function prefetchSofraBackground(puzzleId: string): Promise<void> {
  try {
    const source = sofraBackgroundForPuzzle(puzzleId);
    if (typeof source === 'number') {
      await Asset.fromModule(source).downloadAsync();
    }
  } catch {
    // Arka plan prefetch basarisiz — oyun yine acilir
  }
}

function scheduleBackgroundPrefetch(puzzleId: string): void {
  prefetchTask?.cancel?.();
  prefetchTask = InteractionManager.runAfterInteractions(() => {
    void prefetchSofraBackground(puzzleId);
  });
}

function storePuzzle(gunId: string, zorluk: EglenceZorluk, puzzle: SofraPuzzle): SofraPuzzle {
  cache.set(cacheKey(gunId, zorluk), puzzle);
  saveSofraPuzzleToDisk(gunId, zorluk, puzzle);
  puzzleReady(puzzle);
  return puzzle;
}

/** Disk → async uretim; tek seferde bir istek birlestirilir. */
export function ensureSofraPuzzleAsync(
  gunId: string,
  zorluk: EglenceZorluk,
): Promise<SofraPuzzle> {
  const key = cacheKey(gunId, zorluk);
  const mem = cache.get(key);
  if (mem) return Promise.resolve(mem);

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    const expectedId = `${gunId}:${zorluk}`;
    const fromDisk = await loadSofraPuzzleFromDisk(gunId, zorluk, expectedId);
    if (fromDisk) return storePuzzle(gunId, zorluk, fromDisk);

    const built = await buildDailySofraPuzzleAsync(gunId, zorluk);
    return storePuzzle(gunId, zorluk, built);
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

/**
 * Eglence sekmesi / kart — yalnizca secilen zorluk oncelikli uretilir.
 * Diger zorluklar kullanici lobide sectikten sonra (scheduleSofraPuzzleWarm).
 */
export function prefetchSofraPuzzlesForToday(
  gunId = activePuzzleId(),
  priorityZorluk: EglenceZorluk = 'orta',
  includeOtherZorluklar = false,
): void {
  const order = includeOtherZorluklar
    ? [priorityZorluk, ...ZORLUKLAR.filter((z) => z !== priorityZorluk)]
    : [priorityZorluk];

  prefetchChain = prefetchChain.then(async () => {
    for (const zorluk of order) {
      if (isSofraPuzzleCached(gunId, zorluk)) continue;
      try {
        await ensureSofraPuzzleAsync(gunId, zorluk);
      } catch {
        /* tek zorluk basarisiz — digerlerine devam */
      }
      if (order.length > 1) {
        await new Promise<void>((r) => setTimeout(r, 16));
      }
    }
  });
}

/** Orta hazir olduktan sonra dusuk oncelikle diger zorluklari isit (opsiyonel). */
export function prefetchSofraOtherZorluklarIdle(
  gunId = activePuzzleId(),
  skip: EglenceZorluk,
): void {
  prefetchChain = prefetchChain.then(async () => {
    await new Promise<void>((r) => setTimeout(r, 800));
    for (const zorluk of ZORLUKLAR) {
      if (zorluk === skip || isSofraPuzzleCached(gunId, zorluk)) continue;
      try {
        await ensureSofraPuzzleAsync(gunId, zorluk);
      } catch {
        /* atla */
      }
      await new Promise<void>((r) => setTimeout(r, 400));
    }
  });
}

/**
 * Eglence sekmesi — yalnizca cache'te varsa gorsel/ilerleme isitir.
 * Bulmaca URETMEZ (ana thread'i kilitlemez).
 */
export function warmSofraPuzzleCache(gunId = activePuzzleId()): void {
  for (const zorluk of ZORLUKLAR) {
    const hit = cache.get(cacheKey(gunId, zorluk));
    if (hit) {
      warmSofraProgress(hit);
      scheduleBackgroundPrefetch(hit.id);
      return;
    }
  }
  void loadSofraPuzzleFromDisk(gunId, 'orta', `${gunId}:orta`).then((disk) => {
    if (disk) storePuzzle(gunId, 'orta', disk);
  });
}

/** Lobi / oyun — UI thread'e nefes vererek bulmaca hazirlar. */
export function scheduleSofraPuzzleWarm(
  gunId: string,
  zorluk: EglenceZorluk,
  onReady: (puzzle: SofraPuzzle) => void,
): () => void {
  if (isSofraPuzzleCached(gunId, zorluk)) {
    onReady(getDailySofraPuzzle(gunId, zorluk));
    return () => undefined;
  }

  let cancelled = false;
  const task = InteractionManager.runAfterInteractions(() => {
    void ensureSofraPuzzleAsync(gunId, zorluk).then((puzzle) => {
      if (!cancelled) onReady(puzzle);
    });
  });

  return () => {
    cancelled = true;
    task.cancel?.();
  };
}

/** Cache'te varsa aninda doner; yoksa null (senkron build yapmaz). */
export function peekSofraPuzzle(
  gunId = activePuzzleId(),
  zorluk: EglenceZorluk = 'orta',
): SofraPuzzle | null {
  return cache.get(cacheKey(gunId, zorluk)) ?? null;
}
