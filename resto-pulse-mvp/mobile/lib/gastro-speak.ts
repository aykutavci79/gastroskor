import * as Speech from 'expo-speech';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { Platform } from 'react-native';

import { isGastroAudioCuePlaying, playGastroAudioCue, stopGastroAudioCue } from '@/lib/gastro-audio-cues';
import { GASTRO_TTS, type GastroTtsPhraseKey } from '@/lib/gastro-tts-phrases';
import {
  prefetchTurkishTtsVoice,
  resolveTurkishTtsVoiceId,
  ttsLocale,
  ttsSpeechPitch,
  ttsSpeechRate,
} from '@/lib/gastro-tts-voice';
import { applyTurkishTtsNumberWords } from '@/lib/turkish-tts-numbers';
import { prepareTurkishSpeechText } from '@/lib/turkish-text-fold';

export { GASTRO_TTS } from '@/lib/gastro-tts-phrases';

const TR_LOCALE = ttsLocale();

type SpeakOptions = {
  onDone?: () => void;
};

let speaking = false;
let playbackAudioModeReady = false;
/** gastroStopSpeaking sonrasi kuyruktaki cumleler calinmasin */
let speakSequenceGeneration = 0;

/** iOS ozel harfleri harf harf okuyabiliyor; rakamlar kelimeye cevrilir. */
function prepareSpeechText(text: string): string {
  const input = typeof text === 'string' ? text : '';
  const withNumberWords = applyTurkishTtsNumberWords(input);
  if (Platform.OS === 'android') {
    return withNumberWords
      .replace(/[’']/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return prepareTurkishSpeechText(withNumberWords);
}

/** iOS: AVSpeechSynthesizer kayit oturumunu paylasmasin — hoparlorden duyulsun. */
function iosTtsSpeakOptions(): Pick<Speech.SpeechOptions, 'useApplicationAudioSession'> | undefined {
  if (Platform.OS !== 'ios') return undefined;
  return { useApplicationAudioSession: false };
}

async function ensureSpeechAudioMode(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
    playbackAudioModeReady = true;
    if (Platform.OS === 'ios') {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  } catch {
    /* ses modu opsiyonel */
  }
}

/** Kayit bittikten sonra Gamze/TTS icin ses oturumunu serbest birak. */
export async function releaseRecordingAudioForSpeech(): Promise<void> {
  gastroStopSpeaking();
  playbackAudioModeReady = false;
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
    const delay = Platform.OS === 'ios' ? 180 : 220;
    await new Promise((resolve) => setTimeout(resolve, delay));
  } catch {
    /* kayit oturumu zaten kapali olabilir */
  }
  await ensureSpeechAudioMode();
}

/** STT baslamadan once — TTS ile mikrofon cakismasini onler. */
export async function prepareSpeechRecognitionAudioMode(): Promise<void> {
  gastroStopSpeaking();
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
    playbackAudioModeReady = false;
  } catch {
    /* ses modu opsiyonel */
  }
}

prefetchTurkishTtsVoice();

export function gastroStopSpeaking(): void {
  speakSequenceGeneration += 1;
  Speech.stop();
  speaking = false;
  void stopGastroAudioCue();
}

export async function gastroIsSpeaking(): Promise<boolean> {
  if (isGastroAudioCuePlaying()) return true;
  try {
    return (await Speech.isSpeakingAsync()) || speaking;
  } catch {
    return speaking;
  }
}

function playGastroPhrase(key: GastroTtsPhraseKey, options?: SpeakOptions): void {
  gastroStopSpeaking();
  speaking = true;
  void (async () => {
    await ensureSpeechAudioMode();
    const played = await playGastroAudioCue(key);
    if (played) {
      speaking = false;
      options?.onDone?.();
      return;
    }
    speakChunk(GASTRO_TTS[key], options?.onDone);
  })();
}

function speakChunk(text: string, onDone?: () => void): void {
  const trimmed = prepareSpeechText(text);
  if (!trimmed) {
    onDone?.();
    return;
  }

  speaking = true;
  void (async () => {
    await ensureSpeechAudioMode();
    const voiceId = await resolveTurkishTtsVoiceId();
    Speech.speak(trimmed, {
      language: TR_LOCALE,
      ...(voiceId ? { voice: voiceId } : {}),
      pitch: ttsSpeechPitch(),
      rate: ttsSpeechRate(),
      volume: 1,
      ...iosTtsSpeakOptions(),
      onDone: () => {
        speaking = false;
        onDone?.();
      },
      onStopped: () => {
        speaking = false;
      },
      onError: () => {
        speaking = false;
        onDone?.();
      },
    });
  })();
}

/** Tek parca konusma */
export function gastroSpeak(text: string, options?: SpeakOptions): void {
  const trimmed = text.trim();
  if (!trimmed) {
    options?.onDone?.();
    return;
  }
  gastroStopSpeaking();
  speakChunk(trimmed, options?.onDone);
}

export function gastroSpeakListening(onDone?: () => void): void {
  playGastroPhrase('listening', {
    onDone: () => {
      if (Platform.OS === 'android') {
        void prepareSpeechRecognitionAudioMode().then(() => {
          setTimeout(() => onDone?.(), 120);
        });
        return;
      }
      setTimeout(() => onDone?.(), 120);
    },
  });
}

export function gastroSpeakResultsReady(onDone?: () => void): void {
  playGastroPhrase('resultsReady', { onDone });
}

export function gastroSpeakNoResults(onDone?: () => void): void {
  playGastroPhrase('noResults', { onDone });
}

export function gastroSpeakConfirmPrompt(onDone?: () => void): void {
  playGastroPhrase('confirmPrompt', { onDone });
}

export function gastroSpeakRetry(onDone?: () => void): void {
  playGastroPhrase('retry', { onDone });
}

/** Whisper kayit — TTS yok; iOS'ta "Dinliyorum" kayda karisip erken kapanmayi tetikler. */
export function gastroPrepareWhisperInput(onReady?: () => void): () => void {
  gastroStopSpeaking();
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  void prepareSpeechRecognitionAudioMode().then(() => {
    if (cancelled) return;
    const delay = Platform.OS === 'ios' ? 420 : 480;
    timer = setTimeout(() => {
      if (!cancelled) onReady?.();
    }, delay);
  });
  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
  };
}

/** Sesli giris acilisi — once Gamze "Dinliyorum", sonra kayit. */
export function gastroPrepareVoiceInput(onReady?: () => void): () => void {
  let cancelled = false;
  let innerCancel: (() => void) | null = null;

  const beginWhisperPrep = () => {
    if (cancelled) return;
    innerCancel = gastroPrepareWhisperInput(onReady);
  };

  playGastroPhrase('listening', {
    onDone: () => {
      if (!cancelled) {
        setTimeout(beginWhisperPrep, Platform.OS === 'android' ? 280 : 200);
      }
    },
  });

  return () => {
    cancelled = true;
    innerCancel?.();
    gastroStopSpeaking();
  };
}

export type VoiceSearchTopPlace = {
  name: string;
  rating?: number | null;
  distanceMeters?: number | null;
};

/** Kesfet sesli arama sonucu — sabit cumle; adet ekranda. */
export function gastroSpeakVoiceSearchResults(count: number, _topPlaces: VoiceSearchTopPlace[]): void {
  if (count <= 0) {
    gastroSpeakNoResults();
    return;
  }
  gastroSpeakResultsReady();
}

type OrderConfirmSpeech = {
  restaurantName: string;
  lines: Array<{ quantity: number; productLabel: string }>;
  totalTl: string | null;
  paymentNote: string;
};

/** Siparis onay sheet — detay ekranda; tek onay cumlesi. */
export function gastroSpeakOrderConfirm(_input: OrderConfirmSpeech, onDone?: () => void): void {
  gastroSpeakConfirmPrompt(onDone);
}

export type VoiceOrderRestaurantSpeech = {
  letter: string;
  name: string;
  /** İlk eşleşen ürün fiyatı — sesli okuma */
  priceHint?: string | null;
};

/** Online siparis aramasi sonrasi — sabit cumle; harfler ekranda. */
export function gastroSpeakVoiceOrderRestaurantOptions(
  options: VoiceOrderRestaurantSpeech[],
  onDone?: () => void,
): void {
  if (!options.length) {
    gastroSpeakNoResults(onDone);
    return;
  }
  gastroSpeakResultsReady(onDone);
}

export type SmartCartSpeechLine = {
  quantity: number;
  label: string;
  unitPriceTl: number;
  lineTotalTl: number;
};

/** Akilli sepet onerisi — detay ekranda; tek onay cumlesi. */
export function gastroSpeakSmartCartProposal(
  _input: {
    letter: string;
    restaurantName: string;
    lines: SmartCartSpeechLine[];
    orderTotal: number;
    budgetMax: number | null;
  },
  onDone?: () => void,
): void {
  gastroSpeakConfirmPrompt(onDone);
}

/** @deprecated gastroSpeakVoiceSearchResults kullan */
export function gastroSpeakSearchResultCount(count: number): void {
  gastroSpeakVoiceSearchResults(count, []);
}
