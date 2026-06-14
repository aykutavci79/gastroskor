import * as Speech from 'expo-speech';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { Platform } from 'react-native';

import {
  prefetchTurkishTtsVoice,
  resolveTurkishTtsVoiceId,
  ttsLocale,
  ttsSpeechPitch,
  ttsSpeechRate,
} from '@/lib/gastro-tts-voice';
import { applyTurkishTtsNumberWords, decimalToTurkishSpeech, integerToTurkishSpeech } from '@/lib/turkish-tts-numbers';
import { prepareTurkishSpeechText } from '@/lib/turkish-text-fold';

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
      shouldDuckAndroid: true,
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

/** Kayit bittikten sonra TTS icin ses oturumunu serbest birak. */
export async function releaseRecordingAudioForSpeech(): Promise<void> {
  gastroStopSpeaking();
  playbackAudioModeReady = false;
  if (Platform.OS === 'ios') {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      });
      await new Promise((resolve) => setTimeout(resolve, 180));
    } catch {
      /* kayit oturumu zaten kapali olabilir */
    }
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
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    playbackAudioModeReady = false;
  } catch {
    /* ses modu opsiyonel */
  }
}

function speakNameForTts(name: string): string {
  return prepareSpeechText(name);
}

prefetchTurkishTtsVoice();

export function gastroStopSpeaking(): void {
  speakSequenceGeneration += 1;
  Speech.stop();
  speaking = false;
}

export async function gastroIsSpeaking(): Promise<boolean> {
  try {
    return await Speech.isSpeakingAsync();
  } catch {
    return speaking;
  }
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

/** Parca parca sirayla oku — restoran adlari karismasin */
function gastroSpeakSequence(chunks: string[], options?: SpeakOptions): void {
  const prepared = chunks.map((chunk) => chunk.trim()).filter(Boolean);
  if (!prepared.length) {
    options?.onDone?.();
    return;
  }

  gastroStopSpeaking();
  const generation = speakSequenceGeneration;
  let index = 0;
  const speakNext = () => {
    if (generation !== speakSequenceGeneration) return;
    if (index >= prepared.length) {
      options?.onDone?.();
      return;
    }
    const chunk = prepared[index];
    index += 1;
    speakChunk(chunk, () => {
      if (generation !== speakSequenceGeneration) return;
      speakNext();
    });
  };
  speakNext();
}

/** Mic / ses overlay acilinca — Android'de TTS mikrofonu bozar, sadece ses modu hazirla. */
export function gastroSpeakListening(onDone?: () => void): void {
  if (Platform.OS === 'android') {
    gastroStopSpeaking();
    void prepareSpeechRecognitionAudioMode().then(() => {
      setTimeout(() => onDone?.(), 320);
    });
    return;
  }

  gastroSpeak('Dinliyorum.', {
    onDone: () => {
      setTimeout(() => onDone?.(), 120);
    },
  });
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

/** Sesli giris acilisi — iOS: once "Dinliyorum", sonra kayit; Android: dogrudan kayit. */
export function gastroPrepareVoiceInput(onReady?: () => void): () => void {
  let cancelled = false;
  let innerCancel: (() => void) | null = null;

  const beginWhisperPrep = () => {
    if (cancelled) return;
    innerCancel = gastroPrepareWhisperInput(onReady);
  };

  if (Platform.OS === 'ios') {
    gastroSpeak('Dinliyorum.', {
      onDone: () => {
        if (!cancelled) {
          setTimeout(beginWhisperPrep, 200);
        }
      },
    });
    return () => {
      cancelled = true;
      innerCancel?.();
      gastroStopSpeaking();
    };
  }

  return gastroPrepareWhisperInput(onReady);
}

export type VoiceSearchTopPlace = {
  name: string;
  rating?: number | null;
  distanceMeters?: number | null;
};

/** Sesli arama sonucu — kisa ozet (ilk 3 isim okunmaz; ekrandan sec) */
export function gastroSpeakVoiceSearchResults(count: number, _topPlaces: VoiceSearchTopPlace[]): void {
  if (count <= 0) {
    gastroSpeak('Sonuç bulamadım.');
    return;
  }

  const countLine =
    count === 1 ? 'bir restoran buldum.' : `${integerToTurkishSpeech(count)} restoran buldum.`;
  gastroSpeak(`${countLine} Ekrandan seçebilirsin.`);
}

type OrderConfirmSpeech = {
  restaurantName: string;
  lines: Array<{ quantity: number; productLabel: string }>;
  totalTl: string | null;
  paymentNote: string;
};

/** Siparis onay sheet — ozet + onay sorusu */
export function gastroSpeakOrderConfirm(input: OrderConfirmSpeech, onDone?: () => void): void {
  const linePart = input.lines
    .map((row) => `${integerToTurkishSpeech(row.quantity)} ${speakNameForTts(row.productLabel)}`)
    .join(', ');
  const totalPart = input.totalTl
    ? `Toplam ${applyTurkishTtsNumberWords(input.totalTl)} lira.`
    : '';
  gastroSpeakSequence(
    [
      `${speakNameForTts(input.restaurantName)}.`,
      linePart,
      totalPart,
      input.paymentNote,
      'Onaylıyor musun? Evet dersen gönderirim.',
    ].filter(Boolean),
    { onDone },
  );
}

export type VoiceOrderRestaurantSpeech = {
  letter: string;
  name: string;
  /** İlk eşleşen ürün fiyatı — sesli okuma */
  priceHint?: string | null;
};

/** Online siparis aramasi sonrasi — kisa ozet; A/B/C isimleri ekranda */
export function gastroSpeakVoiceOrderRestaurantOptions(
  options: VoiceOrderRestaurantSpeech[],
  onDone?: () => void,
): void {
  if (!options.length) {
    gastroSpeak('Uygun restoran bulamadım.', { onDone });
    return;
  }

  const countLine =
    options.length === 1
      ? 'bir restoran buldum.'
      : `${integerToTurkishSpeech(options.length)} restoran buldum.`;
  gastroSpeak(`${countLine} Harfleri ekrandan seçebilirsin.`, { onDone });
}

export type SmartCartSpeechLine = {
  quantity: number;
  label: string;
  unitPriceTl: number;
  lineTotalTl: number;
};

/** Akıllı sepet — en uygun restoran + fiyat detayı */
export function gastroSpeakSmartCartProposal(
  input: {
    letter: string;
    restaurantName: string;
    lines: SmartCartSpeechLine[];
    orderTotal: number;
    budgetMax: number | null;
  },
  onDone?: () => void,
): void {
  const chunks: string[] = [
    `${input.letter} harfi, ${speakNameForTts(input.restaurantName)}.`,
    `Toplam ${integerToTurkishSpeech(Math.round(input.orderTotal))} lira.`,
  ];

  input.lines.forEach((row) => {
    const unit = integerToTurkishSpeech(Math.round(row.unitPriceTl));
    chunks.push(
      `${integerToTurkishSpeech(row.quantity)} ${speakNameForTts(row.label)}, tanesi ${unit} lira.`,
    );
  });

  if (input.budgetMax != null) {
    chunks.push(`${integerToTurkishSpeech(input.budgetMax)} lira butcenin altinda.`);
  }

  chunks.push('Onaylıyor musun? Evet dersen hazırlarım.');
  gastroSpeakSequence(chunks, { onDone });
}

/** @deprecated gastroSpeakVoiceSearchResults kullan */
export function gastroSpeakSearchResultCount(count: number): void {
  gastroSpeakVoiceSearchResults(count, []);
}
