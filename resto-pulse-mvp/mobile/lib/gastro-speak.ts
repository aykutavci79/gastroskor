import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import { isGastroAudioCuePlaying, playGastroAudioCue, stopGastroAudioCue } from '@/lib/gastro-audio-cues';
import {
  applyRecordingAudioMode,
  applySpeakerPlaybackMode,
  awaitIosNavigationSettled,
  handoffRecordingToPlayback,
} from '@/lib/gastro-audio-session';
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

/** iOS: TTS, applySpeakerPlaybackMode ile ayarlanan playback oturumunu kullansin. */
function iosTtsSpeakOptions(): Pick<Speech.SpeechOptions, 'useApplicationAudioSession'> | undefined {
  if (Platform.OS !== 'ios') return undefined;
  return { useApplicationAudioSession: true };
}

/** Kayit bittikten sonra Gamze/TTS icin ses oturumunu serbest birak. */
export async function releaseRecordingAudioForSpeech(): Promise<void> {
  await handoffRecordingToPlayback();
}

/** STT baslamadan once — TTS ile mikrofon cakismasini onler. */
export async function prepareSpeechRecognitionAudioMode(): Promise<void> {
  gastroStopSpeaking();
  await applyRecordingAudioMode();
}

prefetchTurkishTtsVoice();

/** Yalnizca cihaz TTS — Gamze mp3 cue'yu kesmez. */
export function gastroStopTtsOnly(): void {
  Speech.stop();
  speaking = false;
}

export function gastroStopSpeaking(): void {
  gastroStopTtsOnly();
  void stopGastroAudioCue();
}

/** Kayit / navigasyon sonrasi hoparlorden oynatma. */
export async function ensureGastroPlaybackReady(): Promise<void> {
  gastroStopSpeaking();
  await handoffRecordingToPlayback();
  await awaitIosNavigationSettled();
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
    await ensureGastroPlaybackReady();
    const played = await playGastroAudioCue(key);
    if (played) {
      speaking = false;
      options?.onDone?.();
      return;
    }
    await speakChunk(GASTRO_TTS[key], options?.onDone);
  })();
}

async function speakChunk(text: string, onDone?: () => void): Promise<void> {
  const trimmed = prepareSpeechText(text);
  if (!trimmed) {
    onDone?.();
    return;
  }

  speaking = true;
  await applySpeakerPlaybackMode();
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
}

/** Tek parca konusma */
export function gastroSpeak(text: string, options?: SpeakOptions): void {
  const trimmed = text.trim();
  if (!trimmed) {
    options?.onDone?.();
    return;
  }
  gastroStopSpeaking();
  void (async () => {
    await ensureGastroPlaybackReady();
    await speakChunk(trimmed, options?.onDone);
  })();
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
    const delay = Platform.OS === 'ios' ? 460 : 480;
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
        setTimeout(beginWhisperPrep, Platform.OS === 'android' ? 300 : 360);
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
