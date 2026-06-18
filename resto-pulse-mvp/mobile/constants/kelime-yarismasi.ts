/** Günlük tur sayısı */
export const TUR_SAYISI = 6;

export function turHarfSayisi(turNo: number): number {
  if (turNo < 1 || turNo > TUR_SAYISI) {
    return 4;
  }
  return 3 + turNo;
}

export const CEVAP_SURE_MS = 15_000;
export const JOKER_SURE_BONUS_MS = 5_000;
export const JOKER_MAX_TOPLAM_SURE_MS = 15_000;

export type KokenTipi = 'turkce' | 'yabanci';
