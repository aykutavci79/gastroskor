import { Platform } from 'react-native';

import { VOICE_CONTEXT_PHRASES } from '@/constants/voice-product-catalog';

/**
 * Gastro Siparis STT — uzun cumle (fiyat + urun) icin dinleme ayarlari.
 *
 * continuous:false iOS 18+ her isFinal'da keser ("lahmacun" deyince durur).
 * Android'de sessizlik timeout'lari kisa kalirsa erken kapanir.
 */
export function buildGastroSpeechStartOptions(): Record<string, unknown> {
  const options: Record<string, unknown> = {
    lang: 'tr-TR',
    interimResults: true,
    continuous: true,
    maxAlternatives: 1,
    contextualStrings: VOICE_CONTEXT_PHRASES.slice(0, 50),
    iosTaskHint: 'search',
  };

  if (Platform.OS === 'android') {
    options.androidIntentOptions = {
      /** En az bu kadar dinle (erken kapanmayi geciktir). */
      EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 2500,
      /** Konusma bitince sessizlik — sonra oturumu kapat. */
      EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 3200,
      /** Kelimeler arasi kisa duraklamaya tolerans. */
      EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1800,
    };
  }

  return options;
}
