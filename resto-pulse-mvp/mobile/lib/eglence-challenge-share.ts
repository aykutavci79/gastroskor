export const EGLENCE_SHARE_URL = 'https://www.gastroskor.com.tr';

export type EglenceChallengeGame = 'mini_sudoku' | 'kelime_yarismasi' | 'kelime_sofrasi';

export function formatChallengeElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function buildEglenceChallengeShareText(
  game: EglenceChallengeGame,
  opts: { elapsedMs?: number; score?: number },
): string {
  if (game === 'mini_sudoku' && opts.elapsedMs != null) {
    const time = formatChallengeElapsed(opts.elapsedMs);
    return (
      `GastroSkor'daki Sudoku'yu ${time} sürede çözdüm. Challenge'e var mısın?\n` +
      EGLENCE_SHARE_URL
    );
  }
  if (game === 'kelime_sofrasi' && opts.elapsedMs != null) {
    const time = formatChallengeElapsed(opts.elapsedMs);
    return (
      `GastroSkor Kelime Sofrası'nı ${time} sürede tamamladım. Sen de dene!\n` +
      EGLENCE_SHARE_URL
    );
  }
  const score = opts.score ?? 0;
  return (
    `GastroSkor Kelime Yarışması'nda ${score} puan yaptım. Sen de dene!\n` +
    EGLENCE_SHARE_URL
  );
}
