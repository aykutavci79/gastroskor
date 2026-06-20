import AsyncStorage from '@react-native-async-storage/async-storage';

import type { EglenceZorluk } from '@/constants/eglence-zorluk';
import { SOFRA_STORAGE_PREFIX } from '@/constants/kelime-sofrasi';

import type { SofraPuzzle } from './types';

/** Generator / cache sürümü — değişince disk geçersiz. */
export const SOFRA_PUZZLE_DISK_VERSION = 9;

function diskKey(gunId: string, zorluk: EglenceZorluk, tur: number): string {
  return `${SOFRA_STORAGE_PREFIX}:puzzle:v${SOFRA_PUZZLE_DISK_VERSION}:${gunId}:${zorluk}:t${tur}`;
}

function isValidPuzzle(raw: unknown, expectedId: string): raw is SofraPuzzle {
  if (!raw || typeof raw !== 'object') return false;
  const p = raw as SofraPuzzle;
  return (
    p.id === expectedId &&
    Array.isArray(p.wheel) &&
    p.wheel.length >= 5 &&
    Array.isArray(p.words) &&
    p.words.length >= 2 &&
    Array.isArray(p.grid)
  );
}

export async function loadSofraPuzzleFromDisk(
  gunId: string,
  zorluk: EglenceZorluk,
  expectedId: string,
  tur = 0,
): Promise<SofraPuzzle | null> {
  try {
    const raw = await AsyncStorage.getItem(diskKey(gunId, zorluk, tur));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidPuzzle(parsed, expectedId)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSofraPuzzleToDisk(
  gunId: string,
  zorluk: EglenceZorluk,
  puzzle: SofraPuzzle,
  tur = 0,
): void {
  void AsyncStorage.setItem(diskKey(gunId, zorluk, tur), JSON.stringify(puzzle)).catch(() => {
    /* disk dolu vb. — oyun yine calisir */
  });
}
