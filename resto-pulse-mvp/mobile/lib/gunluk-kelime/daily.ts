import { mulberry32, seedFromString } from '@/lib/mini-sudoku/rng';

import { gunlukKelimeCevapHavuzu } from './words';

/** Günlük cevap — tüm oyuncular aynı gün aynı kelime (17:00 TR dönemi). */
export function gunlukKelimeCevabi(puzzleId: string): string {
  const pool = gunlukKelimeCevapHavuzu();
  if (!pool.length) {
    throw new Error('gunluk-kelime: sozluk bos');
  }
  const rand = mulberry32(seedFromString(`gastro-gunluk-kelime:${puzzleId}`));
  const idx = Math.floor(rand() * pool.length);
  return pool[idx]!;
}
