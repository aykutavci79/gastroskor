import { buildDailySofraPuzzle } from '@/lib/kelime-sofrasi/puzzle';
import { activePuzzleId } from '@/lib/mini-sudoku/schedule';

import type { EglenceZorluk } from '@/constants/eglence-zorluk';

import type { SofraPuzzle } from './types';

const CACHE_VERSION = 3;
const cache = new Map<string, SofraPuzzle>();

/** Günlük bulmaca bir kez üretilir (seviye başına), sonra bellekten döner. */
export function getDailySofraPuzzle(
  gunId = activePuzzleId(),
  zorluk: EglenceZorluk = 'orta',
): SofraPuzzle {
  const key = `${gunId}:${zorluk}:v${CACHE_VERSION}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const built = buildDailySofraPuzzle(gunId, zorluk);
  cache.set(key, built);
  return built;
}
