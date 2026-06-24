import type { EglenceZorluk } from '@/constants/eglence-zorluk';
import { sofraPuzzleKey } from '@/constants/eglence-zorluk';

import templates from '@/data/kelime-sofrasi/static-fallback-puzzles.json';

import type { SofraPuzzle } from './types';

type SofraPuzzleTemplate = Omit<SofraPuzzle, 'id'>;

const TEMPLATE_BY_ZORLUK: Record<EglenceZorluk, SofraPuzzleTemplate> = {
  kolay: templates.kolay as SofraPuzzleTemplate,
  orta: templates.orta as SofraPuzzleTemplate,
  zor: templates.zor as SofraPuzzleTemplate,
};

/** API/disk yokken anında döner — crossword pack / havuz taraması yok. */
export function buildSofraPuzzleFallbackQuick(
  gunId: string,
  zorluk: EglenceZorluk,
  tur = 0,
): SofraPuzzle {
  const puzzleId = sofraPuzzleKey(gunId, zorluk, tur);
  const template = TEMPLATE_BY_ZORLUK[zorluk];
  return {
    ...template,
    id: puzzleId,
    zorluk,
    words: template.words.map((w) => ({ ...w })),
    bonusKelimeler: [...template.bonusKelimeler],
    wheel: [...template.wheel],
    grid: template.grid.map((row) => row.map((cell) => (cell ? { ...cell, wordIds: [...cell.wordIds] } : null))),
  };
}
