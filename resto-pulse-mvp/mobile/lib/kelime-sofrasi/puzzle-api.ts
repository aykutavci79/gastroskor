import type { EglenceZorluk } from '@/constants/eglence-zorluk';
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

/** Havuzdan günlük bulmaca — tüm kullanıcılar aynı kaydı alır. */
export async function fetchSofraPuzzleFromPool(
  gunId: string,
  zorluk: EglenceZorluk,
  tur: number,
  expectedId: string,
): Promise<SofraPuzzle | null> {
  const params = new URLSearchParams({
    zorluk,
    tur: String(tur),
    gun_id: gunId,
  });
  const { signal, clear } = createFetchTimeoutSignal(12_000);
  try {
    const res = await fetch(`${getApiV1Base()}/eglence/kelime-sofrasi/puzzle?${params}`, {
      signal,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as SofraPuzzleApiResponse;
    if (!isValidPuzzle(body.puzzle, expectedId)) return null;
    return body.puzzle;
  } catch {
    return null;
  } finally {
    clear();
  }
}
