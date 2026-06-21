import { GUNLUK_KELIME_MAX_GUESSES } from '@/constants/gunluk-kelime';
import { SUDOKU_MAX_HINTS, SUDOKU_MAX_LIVES } from '@/lib/mini-sudoku/constants';

export type EglenceScoreResult = {
  score: number;
  detail: string;
};

/** Sudoku: 5000 taban − süre − can − ipucu cezası (min 100). */
export function scoreMiniSudoku(input: {
  elapsedMs: number;
  livesRemaining: number;
  maxLives?: number;
  hintsRemaining: number;
  maxHints?: number;
}): EglenceScoreResult {
  const maxLives = input.maxLives ?? SUDOKU_MAX_LIVES;
  const maxHints = input.maxHints ?? SUDOKU_MAX_HINTS;
  const elapsedSec = Math.max(0, Math.floor(input.elapsedMs / 1000));
  const livesLost = Math.max(0, maxLives - input.livesRemaining);
  const hintsUsed = Math.max(0, maxHints - input.hintsRemaining);
  const score = Math.max(100, Math.round(5000 - elapsedSec * 8 - livesLost * 400 - hintsUsed * 150));
  const detail = `${elapsedSec}s · ${livesLost} can kaybı · ${hintsUsed} ipucu`;
  return { score, detail };
}

/** Kelime Sofrası turu: 3000 taban − süre − ipucu (min 100). */
export function scoreKelimeSofrasi(input: { elapsedMs: number; hintsUsed: number }): EglenceScoreResult {
  const elapsedSec = Math.max(0, Math.floor(input.elapsedMs / 1000));
  const hintsUsed = Math.max(0, input.hintsUsed);
  const score = Math.max(100, Math.round(3000 - elapsedSec * 5 - hintsUsed * 120));
  const detail = `${elapsedSec}s · ${hintsUsed} ipucu`;
  return { score, detail };
}

/** Günlük Kelime: kazanınca kalan deneme hakkına göre (min 200), kaybedince 0. */
export function scoreGunlukKelime(input: {
  won: boolean;
  guessCount: number;
  maxGuesses?: number;
}): EglenceScoreResult {
  const maxGuesses = input.maxGuesses ?? GUNLUK_KELIME_MAX_GUESSES;
  if (!input.won) {
    return { score: 0, detail: `${input.guessCount} deneme · kelime bulunamadı` };
  }
  const remaining = Math.max(0, maxGuesses - input.guessCount);
  const score = Math.max(200, (remaining + 1) * 400);
  return { score, detail: `${input.guessCount}. denemede · ${remaining} hak kaldı` };
}

/** Kelime Yarışması: tur motorundaki ham puan zaten normalize. */
export function scoreKelimeYarismasi(input: { rawScore: number; maxScore: number }): EglenceScoreResult {
  const score = Math.max(0, input.rawScore);
  const detail = `En fazla ${input.maxScore} puan`;
  return { score, detail };
}
