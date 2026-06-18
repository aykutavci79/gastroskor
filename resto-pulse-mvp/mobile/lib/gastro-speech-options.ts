import { Platform } from 'react-native';

import { VOICE_CONTEXT_PHRASES } from '@/constants/voice-product-catalog';
import { VOICE_WHISPER_CONTEXT_PHRASES } from '@/lib/voice-stt-phrase-fixes';
import { KESFET_SEARCH_CONTEXT_PHRASES } from '@/lib/voice-search-stt-fix';
import { supportsContinuousListening } from '@/lib/speech-recognition-native';

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
    continuous: supportsContinuousListening(),
    maxAlternatives: 1,
    contextualStrings: [
      ...VOICE_CONTEXT_PHRASES,
      ...KESFET_SEARCH_CONTEXT_PHRASES,
      ...VOICE_WHISPER_CONTEXT_PHRASES,
    ].slice(0, 80),
  };

  if (Platform.OS === 'ios') {
    options.iosTaskHint = 'search';
    options.iosCategory = {
      category: 'playAndRecord',
      categoryOptions: ['defaultToSpeaker', 'allowBluetooth'],
      mode: 'measurement',
    };
  }

  if (Platform.OS === 'android') {
    options.androidRecognitionServicePackage = 'com.google.android.googlequicksearchbox';
    options.androidIntentOptions = {
      EXTRA_LANGUAGE_MODEL: 'free_form',
      /** Konusma bitince sessizlik — sonra oturumu kapat. */
      EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 2200,
      /** Kelimeler arasi kisa duraklamaya tolerans. */
      EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1600,
    };
  }

  return options;
}
