import type { EglenceZorluk } from '@/constants/eglence-zorluk';
import { sofraKelimeSayisiGecerli } from '@/constants/eglence-zorluk';
import { SOFRA_MIN_KELIME_UZUNLUGU } from '@/constants/kelime-sofrasi';

import { validateSofraCrossword, validateStoredSofraGrid } from './grid-runs';
import { tdkLexicon } from './tdk-lexicon';
import type { SofraPuzzle } from './types';

/** API / disk bulmacasını oyun öncesi doğrula — aynı eksen alt-dizi çiftlerini reddet. */
export function isSofraPuzzleStructurallyValid(
  puzzle: SofraPuzzle,
  zorluk: EglenceZorluk,
  options?: { skipLexicon?: boolean },
): boolean {
  if (!sofraKelimeSayisiGecerli(zorluk, puzzle.words.length)) return false;
  if (puzzle.words.some((w) => w.id.startsWith('fb-'))) return false;
  if (!Array.isArray(puzzle.wheel) || puzzle.wheel.length < 5) return false;
  if (!Array.isArray(puzzle.grid) || puzzle.grid.length === 0) return false;
  if (!options?.skipLexicon) {
    const wordCheck = validateSofraCrossword(puzzle.words, tdkLexicon(), SOFRA_MIN_KELIME_UZUNLUGU);
    if (!wordCheck.ok) return false;
  }
  return validateStoredSofraGrid(puzzle.grid, puzzle.words, SOFRA_MIN_KELIME_UZUNLUGU).ok;
}
