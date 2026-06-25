import type { EglenceZorluk } from '@/constants/eglence-zorluk';
import { sofraPuzzleKey } from '@/constants/eglence-zorluk';
import { SOFRA_GUNLUK_TAMAMLAMA_LIMIT } from '@/constants/kelime-sofrasi';
import { seedFromString } from '@/lib/mini-sudoku/rng';
import templates from '@/data/kelime-sofrasi/static-fallback-puzzles.json';

import type { SofraPuzzle } from './types';

type SofraPuzzleTemplate = Omit<SofraPuzzle, 'id'>;

type StaticFallbackFile = {
  variants: Record<EglenceZorluk, SofraPuzzleTemplate[]>;
};

function cloneTemplate(template: SofraPuzzleTemplate): SofraPuzzleTemplate {
  return {
    ...template,
    words: template.words.map((w) => ({ ...w })),
    bonusKelimeler: [...template.bonusKelimeler],
    wheel: [...template.wheel],
    grid: template.grid.map((row) =>
      row.map((cell) => (cell ? { ...cell, wordIds: [...cell.wordIds] } : null)),
    ),
  };
}

function variantsFor(zorluk: EglenceZorluk): SofraPuzzleTemplate[] {
  const file = templates as StaticFallbackFile;
  const list = file.variants?.[zorluk];
  if (Array.isArray(list) && list.length > 0) return list;
  return [];
}

function variantIndex(gunId: string, zorluk: EglenceZorluk, tur: number, variantCount: number): number {
  if (variantCount <= 1) return 0;
  const dayOffset = seedFromString(`sofra-fb:${gunId}:${zorluk}`) % variantCount;
  return (tur + dayOffset) % variantCount;
}

/** API/disk yokken anında döner — tur başına farklı şablon (aynı ızgara tekrarı yok). */
export function buildSofraPuzzleFallbackQuick(
  gunId: string,
  zorluk: EglenceZorluk,
  tur = 0,
): SofraPuzzle {
  const puzzleId = sofraPuzzleKey(gunId, zorluk, tur);
  const variants = variantsFor(zorluk);
  const idx = variantIndex(gunId, zorluk, tur, variants.length);
  const template = cloneTemplate(variants[idx] ?? variants[0]!);
  return {
    ...template,
    id: puzzleId,
    zorluk,
  };
}

/** Havuzdaki şablon sayısı günlük tur limitini karşılıyor mu (dev dahil). */
export function sofraStaticFallbackCoversDailyRounds(zorluk: EglenceZorluk): boolean {
  return variantsFor(zorluk).length >= SOFRA_GUNLUK_TAMAMLAMA_LIMIT;
}
