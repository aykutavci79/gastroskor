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
import { prepareTurkishSpeechText } from '@/lib/turkish-text-fold';

const TR_LOCALE = ttsLocale();

type SpeakOptions = {
  onDone?: () => void;
};

let speaking = false;
let playbackAudioModeReady = false;

/** iOS ozel harfleri harf harf okuyabiliyor; Android Google TTS Turkce karakterle daha iyi. */
function prepareSpeechText(text: string): string {
  const input = typeof text === 'string' ? text : '';
  if (Platform.OS === 'android') {
    return input
      .replace(/[’']/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return prepareTurkishSpeechText(input);
}

async function ensureSpeechAudioMode(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    playbackAudioModeReady = true;
  } catch {
    /* ses modu opsiyonel */
  }
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
  let index = 0;
  const speakNext = () => {
    if (index >= prepared.length) {
      options?.onDone?.();
      return;
    }
    const chunk = prepared[index];
    index += 1;
    speakChunk(chunk, speakNext);
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

/** Sesli giris acilisi — Android Whisper kayit, iOS TTS + kayit. Cleanup fonksiyonu doner. */
export function gastroPrepareVoiceInput(onReady?: () => void): () => void {
  return gastroPrepareWhisperInput(onReady);
}

export type VoiceSearchTopPlace = {
  name: string;
  rating?: number | null;
  distanceMeters?: number | null;
};

function formatDistanceForSpeech(distanceMeters?: number | null): string | null {
  if (distanceMeters == null) return null;
  if (distanceMeters >= 1000) {
    const km = distanceMeters / 1000;
    const rounded = km >= 10 ? Math.round(km) : Number(km.toFixed(1));
    return `${String(rounded).replace('.', ',')} kilometre`;
  }
  return `${Math.round(distanceMeters)} metre`;
}

function formatRatingForSpeech(rating?: number | null): string | null {
  if (rating == null) return null;
  return `${rating.toFixed(1).replace('.', ',')} puan`;
}

function rankLabel(index: number): string {
  if (index === 0) return 'Birinci';
  if (index === 1) return 'İkinci';
  return 'Üçüncü';
}

/** Sesli arama sonucu — adet + ilk 3 restoran (ayri cumleler) */
export function gastroSpeakVoiceSearchResults(count: number, topPlaces: VoiceSearchTopPlace[]): void {
  if (count <= 0) {
    gastroSpeak('Sonuç bulamadım.');
    return;
  }

  const chunks: string[] = [
    count === 1 ? '1 restoran buldum.' : `${count} restoran buldum.`,
  ];

  topPlaces.slice(0, 3).forEach((place, index) => {
    chunks.push(`${rankLabel(index)}, ${speakNameForTts(place.name)}.`);
    const details = [formatRatingForSpeech(place.rating), formatDistanceForSpeech(place.distanceMeters)]
      .filter(Boolean)
      .join(', ');
    if (details) chunks.push(`${details}.`);
  });

  gastroSpeakSequence(chunks);
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
    .map((row) => `${row.quantity} ${speakNameForTts(row.productLabel)}`)
    .join(', ');
  const totalPart = input.totalTl ? `Toplam ${input.totalTl} lira.` : '';
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

/** Online siparis aramasi sonrasi A/B/C secenekleri */
export function gastroSpeakVoiceOrderRestaurantOptions(
  options: VoiceOrderRestaurantSpeech[],
  onDone?: () => void,
): void {
  if (!options.length) {
    gastroSpeak('Uygun restoran bulamadım.', { onDone });
    return;
  }

  const chunks: string[] = [
    options.length === 1
      ? '1 restoran buldum.'
      : `${options.length} restoran buldum.`,
    'Hangisinden sipariş vermek istersin?',
  ];

  options.slice(0, 3).forEach((row) => {
    const pricePart = row.priceHint ? `, ${row.priceHint}` : '';
    chunks.push(`${row.letter} harfi, ${speakNameForTts(row.name)}${pricePart}.`);
  });

  if (options.length > 3) {
    chunks.push('Daha fazla seçenek ekranda.');
  }

  chunks.push(
    "Restoran seçmeden de söyleyebilirsin: 3 lahmacun 1 ayran, 400 lira geçmesin.",
  );
  chunks.push("Ya da B'den 3 lahmacun, kapıda kredi kartı de.");
  gastroSpeakSequence(chunks, { onDone });
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
    `Toplam ${String(Math.round(input.orderTotal)).replace('.', ',')} lira.`,
  ];

  input.lines.forEach((row) => {
    const unit = String(Math.round(row.unitPriceTl)).replace('.', ',');
    chunks.push(
      `${row.quantity} ${speakNameForTts(row.label)}, tanesi ${unit} lira.`,
    );
  });

  if (input.budgetMax != null) {
    chunks.push(`${input.budgetMax} lira bütçenin altında.`);
  }

  chunks.push('Onaylıyor musun? Evet dersen hazırlarım.');
  gastroSpeakSequence(chunks, { onDone });
}

/** @deprecated gastroSpeakVoiceSearchResults kullan */
export function gastroSpeakSearchResultCount(count: number): void {
  gastroSpeakVoiceSearchResults(count, []);
}
