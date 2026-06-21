import { sofraKelimeBuyuk } from '@/lib/kelime-sofrasi/turkce-harf';

import { GUNLUK_KELIME_LENGTH } from '@/constants/gunluk-kelime';

export type LetterState = 'correct' | 'present' | 'absent' | 'empty' | 'typing';

const STATE_RANK: Record<LetterState, number> = {
  empty: 0,
  typing: 0,
  absent: 1,
  present: 2,
  correct: 3,
};

/** Wordle puanlama anahtarı — tam Türkçe harf; I≠İ, O≠Ö, U≠Ü, C≠Ç, S≠Ş, G≠Ğ. */
function harfAnahtar(ch: string): string {
  if (!ch) return '';
  try {
    return sofraKelimeBuyuk(ch);
  } catch {
    return '';
  }
}

/** Wordle tarzı harf durumu (bire bir Türkçe harf + çift harf tüketimi). */
export function scoreGunlukKelimeGuess(answer: string, guess: string): LetterState[] {
  const a = [...sofraKelimeBuyuk(answer)];
  const g = [...sofraKelimeBuyuk(guess)];
  if (g.length !== GUNLUK_KELIME_LENGTH || a.length !== GUNLUK_KELIME_LENGTH) {
    throw new Error('gunluk-kelime: uzunluk');
  }

  const result: LetterState[] = Array(GUNLUK_KELIME_LENGTH).fill('absent');
  const remaining = new Map<string, number>();
  for (const ch of a) {
    const key = harfAnahtar(ch);
    remaining.set(key, (remaining.get(key) ?? 0) + 1);
  }

  for (let i = 0; i < GUNLUK_KELIME_LENGTH; i++) {
    const gCh = g[i];
    const aCh = a[i];
    if (!gCh || !aCh) continue;
    const gKey = harfAnahtar(gCh);
    const aKey = harfAnahtar(aCh);
    if (gKey === aKey) {
      result[i] = 'correct';
      remaining.set(gKey, (remaining.get(gKey) ?? 0) - 1);
    }
  }

  for (let i = 0; i < GUNLUK_KELIME_LENGTH; i++) {
    if (result[i] === 'correct') continue;
    const gCh = g[i];
    if (!gCh) continue;
    const gKey = harfAnahtar(gCh);
    const left = remaining.get(gKey) ?? 0;
    if (left > 0) {
      result[i] = 'present';
      remaining.set(gKey, left - 1);
    }
  }

  return result;
}

/** Tahmin puanlama — hata durumunda null (kırmızı crash yerine sözlük uyarısı). */
export function tryScoreGunlukKelimeGuess(answer: string, guess: string): LetterState[] | null {
  try {
    return scoreGunlukKelimeGuess(answer, guess);
  } catch {
    return null;
  }
}

function applyKeyState(
  next: Record<string, LetterState>,
  ch: string,
  st: LetterState,
): void {
  if (!ch || st === 'empty' || st === 'typing') return;
  const rank = STATE_RANK[st];
  const prev = next[ch];
  if (!prev || rank > STATE_RANK[prev]) {
    next[ch] = st;
  }
}

export function mergeKeyboardStates(
  current: Record<string, LetterState>,
  word: string,
  states: readonly LetterState[],
): Record<string, LetterState> {
  try {
    const next = { ...current };
    const norm = [...sofraKelimeBuyuk(word)];
    for (let i = 0; i < norm.length && i < states.length; i++) {
      applyKeyState(next, norm[i]!, states[i] ?? 'absent');
    }
    return next;
  } catch {
    return current;
  }
}

export function gunlukKelimeShareEmoji(
  guesses: readonly { states: readonly LetterState[] }[],
): string {
  const map: Record<LetterState, string> = {
    correct: '🟩',
    present: '🟨',
    absent: '⬛',
    empty: '⬜',
    typing: '⬜',
  };
  return guesses.map((row) => row.states.map((s) => map[s] ?? '⬛').join('')).join('\n');
}
