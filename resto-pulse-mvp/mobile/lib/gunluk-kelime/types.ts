import type { LetterState } from '@/lib/gunluk-kelime/engine';

export type GunlukKelimeGuessRow = {
  word: string;
  states: LetterState[];
};

export type GunlukKelimeProgress = {
  puzzleId: string;
  answer: string;
  guesses: GunlukKelimeGuessRow[];
  completedAt: string | null;
  won: boolean;
};
