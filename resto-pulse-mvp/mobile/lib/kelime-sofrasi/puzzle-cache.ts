import { Asset } from 'expo-asset';
import { InteractionManager } from 'react-native';

import type { EglenceZorluk } from '@/constants/eglence-zorluk';
import { sofraPuzzleKey } from '@/constants/eglence-zorluk';
import { sofraBackgroundForPuzzle } from '@/constants/regional-flavor-images';
import { fetchSofraPuzzleFromPool } from '@/lib/kelime-sofrasi/puzzle-api';
import { buildSofraPuzzleFallbackQuick } from '@/lib/kelime-sofrasi/puzzle-fallback-static';
import { tryBuildDailySofraPuzzleAsync } from '@/lib/kelime-sofrasi/puzzle';
import { isSofraPuzzleStructurallyValid } from '@/lib/kelime-sofrasi/puzzle-validate';
import {
  loadSofraPuzzleFromDisk,
  saveSofraPuzzleToDisk,
  SOFRA_PUZZLE_DISK_VERSION,
} from '@/lib/kelime-sofrasi/puzzle-disk-cache';
import { warmSofraProgress } from '@/lib/kelime-sofrasi/storage';
import { sofraPerfDone, sofraPerfMark } from '@/lib/kelime-sofrasi/sofra-perf';
import { activePuzzleId } from '@/lib/mini-sudoku/schedule';

import type { SofraPuzzle } from './types';

const CACHE_VERSION = SOFRA_PUZZLE_DISK_VERSION;
const cache = new Map<string, SofraPuzzle>();
const inflight = new Map<string, Promise<SofraPuzzle>>();
let prefetchTask: { cancel?: () => void } | null = null;
let prefetchChain: Promise<void> = Promise.resolve();

const ZORLUKLAR: EglenceZorluk[] = ['orta', 'kolay', 'zor'];

function cacheKey(gunId: string, zorluk: EglenceZorluk, tur: number): string {
  return `${gunId}:${zorluk}:t${tur}:v${CACHE_VERSION}`;
}

function puzzleReady(puzzle: SofraPuzzle): void {
  warmSofraProgress(puzzle);
}

/** Yöresel lezzet JPG — yalnizca Sofra lobi/oyun (Eglence sekmesinde degil). */
export function prefetchSofraBackgroundForPuzzle(puzzleId: string): void {
  prefetchTask?.cancel?.();
  prefetchTask = InteractionManager.runAfterInteractions(() => {
    void prefetchSofraBackground(puzzleId);
  });
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

async function resolvePuzzleFromSources(
  gunId: string,
  zorluk: EglenceZorluk,
  tur: number,
  expectedId: string,
  userEmail?: string | null,
): Promise<{ puzzle: SofraPuzzle; gunId: string } | null> {
  const t0 = typeof __DEV__ !== 'undefined' && __DEV__ ? Date.now() : 0;
  const devStep = (label: string) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log(`[sofra] ${expectedId} · ${label} (+${Date.now() - t0}ms)`);
    }
  };

  devStep('API isteği…');
  const tApi = sofraPerfMark('fetchDailyPuzzle');
  const fromApi = await fetchSofraPuzzleFromPool(zorluk, tur, gunId, userEmail);
  sofraPerfDone('fetchDailyPuzzle', tApi, fromApi ? 'hit' : 'miss');
  if (fromApi && isSofraPuzzleStructurallyValid(fromApi.puzzle, zorluk, { skipLexicon: true })) {
    devStep('API OK');
    return fromApi;
  }
  if (fromApi && typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn('[sofra] API bulmaca yapısal doğrulama başarısız', expectedId);
  } else if (!fromApi) {
    devStep('API yok / hata');
  }

  devStep('disk okuma…');
  const fromDisk = await loadSofraPuzzleFromDisk(gunId, zorluk, expectedId, tur);
  if (fromDisk && isSofraPuzzleStructurallyValid(fromDisk, zorluk, { skipLexicon: true })) {
    devStep('disk OK');
    return { puzzle: fromDisk, gunId };
  }
  if (fromDisk && typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn('[sofra] disk bulmaca yapısal doğrulama başarısız', expectedId);
  }

  // Yalnızca geliştirici bayrağı: tam havuz üretimi (dakikalarca sürebilir).
  if (
    typeof __DEV__ !== 'undefined' &&
    __DEV__ &&
    process.env.EXPO_PUBLIC_SOFRA_DEV_LOCAL_BUILD === '1'
  ) {
    devStep('yerel üretim (dev bayrak)…');
    const built = await tryBuildDailySofraPuzzleAsync(gunId, zorluk, tur);
    if (built && isSofraPuzzleStructurallyValid(built, zorluk, { skipLexicon: true })) {
      devStep('yerel üretim OK');
      return { puzzle: built, gunId };
    }
  }

  // Prod / normal dev: hızlı yedek — cihazda 40 deneme yapma (özellikle zor mod).
  devStep('hızlı yedek bulmaca');
  const tBuild = sofraPerfMark('buildPuzzle');
  const fallback = buildSofraPuzzleFallbackQuick(gunId, zorluk, tur);
  sofraPerfDone('buildPuzzle', tBuild, 'static-fallback');
  if (isSofraPuzzleStructurallyValid(fallback, zorluk, { skipLexicon: true })) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[sofra] API/disk yok — hızlı yedek kullanıldı', expectedId);
    }
    return { puzzle: fallback, gunId };
  }

  return null;
}

/** Günlük bulmaca — bellek önbelleği (senkron, test/script). */
export function getDailySofraPuzzle(
  gunId = activePuzzleId(),
  zorluk: EglenceZorluk = 'orta',
  tur = 0,
): SofraPuzzle {
  const key = cacheKey(gunId, zorluk, tur);
  const hit = cache.get(key);
  if (hit) return hit;
  throw new Error('Sofra bulmacasi senkron cache miss — ensureSofraPuzzleAsync kullanin.');
}

export function isSofraPuzzleCached(
  gunId = activePuzzleId(),
  zorluk: EglenceZorluk = 'orta',
  tur = 0,
): boolean {
  return cache.has(cacheKey(gunId, zorluk, tur));
}

function storePuzzle(
  gunId: string,
  zorluk: EglenceZorluk,
  tur: number,
  puzzle: SofraPuzzle,
  aliasGunId?: string,
): SofraPuzzle {
  cache.set(cacheKey(gunId, zorluk, tur), puzzle);
  if (aliasGunId && aliasGunId !== gunId) {
    cache.set(cacheKey(aliasGunId, zorluk, tur), puzzle);
  }
  saveSofraPuzzleToDisk(gunId, zorluk, puzzle, tur);
  puzzleReady(puzzle);
  return puzzle;
}

/** Disk → API → (dev) yerel uretim; tek seferde bir istek birlestirilir. */
export function ensureSofraPuzzleAsync(
  gunId: string,
  zorluk: EglenceZorluk,
  tur = 0,
  userEmail?: string | null,
): Promise<SofraPuzzle> {
  const key = cacheKey(gunId, zorluk, tur);
  const mem = cache.get(key);
  if (mem) return Promise.resolve(mem);

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    const expectedId = sofraPuzzleKey(gunId, zorluk, tur);
    const resolved = await resolvePuzzleFromSources(gunId, zorluk, tur, expectedId, userEmail);
    if (!resolved) {
      throw new Error(`Sofra bulmacasi yuklenemedi: ${expectedId}`);
    }
    return storePuzzle(resolved.gunId, zorluk, tur, resolved.puzzle, gunId);
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
      if (isSofraPuzzleCached(gunId, zorluk, 0)) continue;
      try {
        await ensureSofraPuzzleAsync(gunId, zorluk, 0);
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
      if (zorluk === skip || isSofraPuzzleCached(gunId, zorluk, 0)) continue;
      try {
        await ensureSofraPuzzleAsync(gunId, zorluk, 0);
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
    const hit = cache.get(cacheKey(gunId, zorluk, 0));
    if (hit) {
      warmSofraProgress(hit);
      return;
    }
  }
  void loadSofraPuzzleFromDisk(gunId, 'orta', `${gunId}:orta`, 0).then((disk) => {
    if (disk) storePuzzle(gunId, 'orta', 0, disk);
  });
}

/** Lobi / oyun — UI thread'e nefes vererek bulmaca hazirlar. */
export function scheduleSofraPuzzleWarm(
  gunId: string,
  zorluk: EglenceZorluk,
  onReady: (puzzle: SofraPuzzle) => void,
  tur = 0,
): () => void {
  if (isSofraPuzzleCached(gunId, zorluk, tur)) {
    onReady(cache.get(cacheKey(gunId, zorluk, tur))!);
    return () => undefined;
  }

  let cancelled = false;
  let started = false;
  const load = () => {
    if (cancelled || started) return;
    started = true;
    void ensureSofraPuzzleAsync(gunId, zorluk, tur)
      .then((puzzle) => {
        if (!cancelled) onReady(puzzle);
      })
      .catch(() => {
        /* API/disk/dev uretim basarisiz — lobi hazirlaniyor kalir */
      });
  };

  load();
  const task = InteractionManager.runAfterInteractions(load);
  const fallbackTimer = setTimeout(load, 400);

  return () => {
    cancelled = true;
    task.cancel?.();
    clearTimeout(fallbackTimer);
  };
}

/** Cache'te varsa aninda doner; yoksa null (senkron build yapmaz). */
export function peekSofraPuzzle(
  gunId = activePuzzleId(),
  zorluk: EglenceZorluk = 'orta',
  tur = 0,
): SofraPuzzle | null {
  return cache.get(cacheKey(gunId, zorluk, tur)) ?? null;
}

/** Sonraki tur bulmacasini arka planda hazirla. */
export function prefetchSofraTurIdle(
  gunId: string,
  zorluk: EglenceZorluk,
  tur: number,
): void {
  if (tur <= 0 || isSofraPuzzleCached(gunId, zorluk, tur)) return;
  prefetchChain = prefetchChain.then(async () => {
    await new Promise<void>((r) => setTimeout(r, 200));
    try {
      await ensureSofraPuzzleAsync(gunId, zorluk, tur);
    } catch {
      /* atla */
    }
  });
}
