import type { EglenceZorluk } from '@/constants/eglence-zorluk';

export type SofraDirection = 'h' | 'v';

export type SofraPlacedWord = {
  id: string;
  kelime: string;
  ipucu?: string;
  row: number;
  col: number;
  direction: SofraDirection;
};

export type SofraGridCell = {
  row: number;
  col: number;
  letter: string;
  wordIds: string[];
};

export type SofraPuzzle = {
  id: string;
  zorluk: EglenceZorluk;
  words: SofraPlacedWord[];
  /** Çark harflerinden oluşan, ızgarada olmayan sözlük kelimeleri */
  bonusKelimeler: string[];
  wheel: string[];
  rows: number;
  cols: number;
  grid: (SofraGridCell | null)[][];
};

export type SofraProgress = {
  puzzleId: string;
  foundWordIds: string[];
  bonusFound: string[];
  /** @deprecated Eski kayitlar — hintedCells kullan */
  hintedWordIds?: string[];
  hintedCells: string[];
  wheelOrder: number[];
  completedAt: string | null;
  elapsedMs: number;
  /** Ayni gunluk bulmaca (puzzleId) kac kez tamamlandi */
  gunlukTamamlamaSayisi?: number;
};
