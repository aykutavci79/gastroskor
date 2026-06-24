import { InteractionManager } from 'react-native';

import { warmGunlukKelimeLexicon } from '@/lib/gunluk-kelime/words';
import { warmSoruBankasi } from '@/lib/kelime-yarismasi/soru-paketi';
import { sofraHavuzu } from '@/lib/kelime-sofrasi/havuz';
import { sofraPerfDone, sofraPerfMark } from '@/lib/kelime-sofrasi/sofra-perf';
import { warmTdkLexicon } from '@/lib/kelime-sofrasi/tdk-lexicon';

/** Tab bar — oyun kartlarından renk paleti */
export const EGLENCE_TAB_PALETTE = ['#FFAA3C', '#538D4E', '#38BDF8', '#2DD4BF', '#FF6B35', '#C084FC'] as const;

export type EglenceWarmGameId = 'gunluk-kelime' | 'kelime-sofrasi' | 'kelime-yarismasi';

const warmed = new Set<EglenceWarmGameId>();
const warming = new Set<EglenceWarmGameId>();

export function isEglenceGameWarmed(game: EglenceWarmGameId): boolean {
  return warmed.has(game);
}

function runWarmWork(game: EglenceWarmGameId): void {
  if (game === 'gunluk-kelime') warmGunlukKelimeLexicon();
  if (game === 'kelime-sofrasi') {
    const tLex = sofraPerfMark('ensureLexicon');
    warmTdkLexicon();
    sofraPerfDone('ensureLexicon', tLex);
    const tPool = sofraPerfMark('loadSofraPool');
    sofraHavuzu();
    sofraPerfDone('loadSofraPool', tPool);
  }
  if (game === 'kelime-yarismasi') warmSoruBankasi();
}

/**
 * Oyun bazlı lexicon/havuz ısıtması — yalnızca ilgili lobi/oyun açılınca.
 * Kelime Bul · Sudoku: warm gerekmez (yerel / hafif).
 * Splash ve Eğlence hub'da çalıştırma.
 */
export function warmEglenceGame(game: EglenceWarmGameId): void {
  if (warmed.has(game) || warming.has(game)) return;
  warming.add(game);

  InteractionManager.runAfterInteractions(() => {
    try {
      if (warmed.has(game)) return;
      runWarmWork(game);
      warmed.add(game);
    } finally {
      warming.delete(game);
    }
  });
}

/** Arka plan preload — iş bitince warmed işaretlenir (erken oyuna girişte lobi tekrar ısıtır). */
export function warmEglenceGameSync(game: EglenceWarmGameId): void {
  if (warmed.has(game) || warming.has(game)) return;
  warming.add(game);
  try {
    if (warmed.has(game)) return;
    runWarmWork(game);
    warmed.add(game);
  } finally {
    warming.delete(game);
  }
}
