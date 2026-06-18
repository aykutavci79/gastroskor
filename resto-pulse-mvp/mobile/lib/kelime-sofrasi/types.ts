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
  words: SofraPlacedWord[];
  wheel: string[];
  rows: number;
  cols: number;
  grid: (SofraGridCell | null)[][];
};

export type SofraProgress = {
  puzzleId: string;
  foundWordIds: string[];
  wheelOrder: number[];
  completedAt: string | null;
  elapsedMs: number;
};
