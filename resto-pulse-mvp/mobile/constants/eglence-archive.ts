import type { EglenceGameId } from '@/constants/eglence-games';

/** Arşiv günü açma — aktif gün ücretsiz. */
export type EglenceArchiveGameId =
  | 'kelime_sofrasi'
  | 'gunluk_kelime'
  | 'mini_sudoku'
  | 'kelime_yarismasi';

export const EGLENCE_ARCHIVE_DAY_COST: Record<EglenceArchiveGameId, number> = {
  kelime_sofrasi: 15,
  gunluk_kelime: 1,
  mini_sudoku: 3,
  kelime_yarismasi: 3,
};

export function eglenceGameToArchiveGame(gameId: EglenceGameId): EglenceArchiveGameId | null {
  switch (gameId) {
    case 'kelime-sofrasi':
      return 'kelime_sofrasi';
    case 'gunluk-kelime':
      return 'gunluk_kelime';
    case 'mini-sudoku':
      return 'mini_sudoku';
    case 'kelime-yarismasi':
      return 'kelime_yarismasi';
    default:
      return null;
  }
}

export function archiveCostLabel(game: EglenceArchiveGameId): string {
  return `${EGLENCE_ARCHIVE_DAY_COST[game]} GC`;
}
