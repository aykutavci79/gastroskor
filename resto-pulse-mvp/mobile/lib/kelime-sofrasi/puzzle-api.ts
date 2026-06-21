import type { EglenceZorluk } from '@/constants/eglence-zorluk';
import { sofraPuzzleKey } from '@/constants/eglence-zorluk';
import { getApiV1Base } from '@/lib/api-base';
import { createFetchTimeoutSignal } from '@/lib/fetch-timeout';

import type { SofraPuzzle } from './types';

type SofraPuzzleApiResponse = {
  puzzle_id: string;
  gun_id: string;
  zorluk: EglenceZorluk;
  tur: number;
  puzzle: SofraPuzzle;
  is_fallback: boolean;
  source_gun_id?: string | null;
};

function isValidPuzzle(raw: unknown, expectedId: string): raw is SofraPuzzle {
  if (!raw || typeof raw !== 'object') return false;
  const p = raw as SofraPuzzle;
  return (
    p.id === expectedId &&
    Array.isArray(p.wheel) &&
    p.wheel.length >= 5 &&
    Array.isArray(p.words) &&
    p.words.length >= 2 &&
    Array.isArray(p.grid) &&
    !p.words.some((w) => w.id.startsWith('fb-'))
  );
}

export type SofraPoolFetchResult = {
  puzzle: SofraPuzzle;
  gunId: string;
};

/** Havuzdan günlük bulmaca — gun_id bos birakilirsa backend aktif donemi secer. */
export async function fetchSofraPuzzleFromPool(
  zorluk: EglenceZorluk,
  tur: number,
  clientGunId?: string,
): Promise<SofraPoolFetchResult | null> {
  const params = new URLSearchParams({
    zorluk,
    tur: String(tur),
  });
  if (clientGunId) params.set('gun_id', clientGunId);
  const signal = createFetchTimeoutSignal(12_000);
  try {
    const res = await fetch(`${getApiV1Base()}/eglence/kelime-sofrasi/puzzle?${params}`, {
      signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[sofra] puzzle API HTTP', res.status, clientGunId ?? '(server active)');
      }
      return null;
    }
    const body = (await res.json()) as SofraPuzzleApiResponse;
    const expectedId = sofraPuzzleKey(body.gun_id, zorluk, tur);
    if (!isValidPuzzle(body.puzzle, expectedId)) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn(
          '[sofra] puzzle validation fail',
          expectedId,
          (body.puzzle as { id?: string } | undefined)?.id,
        );
      }
      return null;
    }
    return { puzzle: body.puzzle, gunId: body.gun_id };
  } catch (err) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[sofra] puzzle fetch error', err);
    }
    return null;
  }
}
