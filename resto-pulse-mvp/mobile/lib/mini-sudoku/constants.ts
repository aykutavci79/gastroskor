export const SIZE = 6;
export const BOX_ROWS = 2;
export const BOX_COLS = 3;
export const DIGITS = [1, 2, 3, 4, 5, 6] as const;
export type Digit = (typeof DIGITS)[number];

/** Hedef verilen hucre sayisi — dusuk = zor (6x6'da ~14 ipucu ≈ 22 bos). */
export const TARGET_GIVENS = 14;

export const STORAGE_PREFIX = 'gastro_mini_sudoku_v1';
