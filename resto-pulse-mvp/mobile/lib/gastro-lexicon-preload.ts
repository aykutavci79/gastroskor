import { InteractionManager, Platform } from 'react-native';

import { warmGunlukKelimeLexicon } from '@/lib/gunluk-kelime/words';
import { warmSoruBankasi } from '@/lib/kelime-yarismasi/soru-paketi';
import { sofraHavuzu } from '@/lib/kelime-sofrasi/havuz';
import { warmTdkLexicon } from '@/lib/kelime-sofrasi/tdk-lexicon';

import {
  isEglenceGameWarmed,
  warmEglenceGameSync,
  type EglenceWarmGameId,
} from '@/lib/eglence-warm';

const PRELOAD_GAMES: EglenceWarmGameId[] = ['gunluk-kelime', 'kelime-sofrasi', 'kelime-yarismasi'];

let preloadStarted = false;
let preloadStartedAt = 0;

function devLog(message: string): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(`[GastroSkor preload] ${message}`);
  }
}

/** Üç oyun lexicon'u da hazır mı? */
export function isLexiconPreloadReady(): boolean {
  return PRELOAD_GAMES.every((game) => isEglenceGameWarmed(game));
}

/**
 * Splash sonrası arka planda lexicon ısıt — UI bloklamaz.
 * Kelimeler zaten APK'da; ilk erişimde JSON parse + indeks maliyeti burada ödenir.
 * Kullanıcı Keşfet'teyken çalışır; oyuna girince hazır olur.
 */
export function startBackgroundLexiconPreload(): void {
  if (preloadStarted) return;
  preloadStarted = true;
  preloadStartedAt = Date.now();
  devLog("başladı — Keşfet'te 10–15 sn kal, sonra Eğlence → oyun");

  const gapMs = Platform.OS === 'android' ? 280 : 80;
  let index = 0;

  const runNext = () => {
    if (index >= PRELOAD_GAMES.length) {
      const totalMs = Date.now() - preloadStartedAt;
      devLog(`TAMAMLANDI (${totalMs}ms) — artık Kelime Sofrası / Günlük Kelime açabilirsin`);
      return;
    }
    const game = PRELOAD_GAMES[index]!;
    index += 1;
    const stepStart = Date.now();
    InteractionManager.runAfterInteractions(() => {
      warmEglenceGameSync(game);
      devLog(`${game} OK (+${Date.now() - stepStart}ms)`);
      setTimeout(runNext, gapMs);
    });
  };

  setTimeout(runNext, Platform.OS === 'android' ? 400 : 120);
}

/** Test / debug — tüm oyun lexicon'larını sırayla yükle. */
export function preloadAllLexiconsNow(): void {
  warmGunlukKelimeLexicon();
  sofraHavuzu();
  warmTdkLexicon();
  warmSoruBankasi();
}
