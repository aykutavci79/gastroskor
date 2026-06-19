import AsyncStorage from '@react-native-async-storage/async-storage';

import type { EglenceZorluk } from '@/constants/eglence-zorluk';
import { SOFRA_STORAGE_PREFIX } from '@/constants/kelime-sofrasi';

import type { SofraPuzzle } from './types';

/** Generator / cache sürümü — değişince disk geçersiz. */
export const SOFRA_PUZZLE_DISK_VERSION = 4;

function diskKey(gunId: string, zorluk: EglenceZorluk): string {
  return `${SOFRA_STORAGE_PREFIX}:puzzle:v${SOFRA_PUZZLE_DISK_VERSION}:${gunId}:${zorluk}`;
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
): Promise<SofraPuzzle | null> {
  try {
    const raw = await AsyncStorage.getItem(diskKey(gunId, zorluk));
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
): void {
  void AsyncStorage.setItem(diskKey(gunId, zorluk), JSON.stringify(puzzle)).catch(() => {
    /* disk dolu vb. — oyun yine calisir */
  });
}
