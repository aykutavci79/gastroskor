export const SIZE = 9;
export const BOX_ROWS = 3;
export const BOX_COLS = 3;
export const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export type Digit = (typeof DIGITS)[number];

/** Varsayılan hedef ipucu — orta seviye (9×9). */
export const TARGET_GIVENS = 32;

export const STORAGE_PREFIX = 'gastro_sudoku_9x9_v2';

export const SUDOKU_MAX_LIVES = 3;
export const SUDOKU_MAX_HINTS = 5;
export const SUDOKU_UNDO_LIMIT = 60;

/** Kalan bos hücre bu kadar veya azsa otomatik tamamla önerilir. */
export const SUDOKU_AUTO_COMPLETE_THRESHOLD = 5;

/** Koyu neon tahta — notlar mavi, zemin hafif acik (okunabilirlik). */
export const SUDOKU_BOARD_COLORS = {
  bg: '#252532',
  line: '#3A3A48',
  lineThick: '#FF6B35',
  cellSelected: 'rgba(255, 107, 53, 0.48)',
  cellMatch: 'rgba(255, 107, 53, 0.22)',
  cellConflict: 'rgba(255, 92, 92, 0.38)',
  givenText: '#FFFFFF',
  userText: '#FFB347',
  noteText: '#5EB0FF',
  padCount: '#737373',
} as const;