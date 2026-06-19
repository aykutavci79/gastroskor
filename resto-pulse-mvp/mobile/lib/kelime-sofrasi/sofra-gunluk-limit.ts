import { SOFRA_GUNLUK_TAMAMLAMA_LIMIT } from '@/constants/kelime-sofrasi';

import type { SofraProgress } from './types';

export function sofraTamamlamaSayisi(progress: SofraProgress | null | undefined): number {
  if (!progress) return 0;
  if (typeof progress.gunlukTamamlamaSayisi === 'number') {
    return progress.gunlukTamamlamaSayisi;
  }
  return progress.completedAt ? 1 : 0;
}

export function sofraGunlukLimitDoldu(progress: SofraProgress | null | undefined): boolean {
  return sofraTamamlamaSayisi(progress) >= SOFRA_GUNLUK_TAMAMLAMA_LIMIT;
}

export function sofraKalanGunlukHak(progress: SofraProgress | null | undefined): number {
  return Math.max(0, SOFRA_GUNLUK_TAMAMLAMA_LIMIT - sofraTamamlamaSayisi(progress));
}
