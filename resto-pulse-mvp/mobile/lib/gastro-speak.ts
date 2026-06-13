import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import { prepareTurkishSpeechText } from '@/lib/turkish-text-fold';

const TR_LOCALE = 'tr-TR';

type SpeakOptions = {
  onDone?: () => void;
};

let speaking = false;
let trVoiceId: string | null | undefined;

function prefetchTurkishVoice(): void {
  if (trVoiceId !== undefined) return;
  trVoiceId = null;
  void Speech.getAvailableVoicesAsync()
    .then((voices) => {
      const match =
        voices.find((voice) => voice.language === TR_LOCALE) ??
        voices.find((voice) => voice.language?.startsWith('tr'));
      trVoiceId = match?.identifier ?? null;
    })
    .catch(() => {
      trVoiceId = null;
    });
}

prefetchTurkishVoice();

function speakNameForTts(name: string): string {
  return prepareTurkishSpeechText(name);
}

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
  const trimmed = text.trim();
  if (!trimmed) {
    onDone?.();
    return;
  }

  speaking = true;
  Speech.speak(trimmed, {
    language: TR_LOCALE,
    ...(trVoiceId ? { voice: trVoiceId } : {}),
    pitch: 1,
    rate: Platform.OS === 'ios' ? 0.92 : 0.95,
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

/** Mic / ses overlay acilinca */
export function gastroSpeakListening(onDone?: () => void): void {
  gastroSpeak('Dinliyorum.', { onDone });
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
  quantity: number;
  productLabel: string;
  totalTl: string | null;
  paymentNote: string;
};

/** Siparis onay sheet — ozet + onay sorusu */
export function gastroSpeakOrderConfirm(input: OrderConfirmSpeech, onDone?: () => void): void {
  const totalPart = input.totalTl ? `${input.totalTl} lira` : '';
  gastroSpeakSequence(
    [
      `${speakNameForTts(input.restaurantName)}.`,
      `${input.quantity} ${speakNameForTts(input.productLabel)}.`,
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
    chunks.push(`${row.letter} harfi, ${speakNameForTts(row.name)}.`);
  });

  if (options.length > 3) {
    chunks.push('Daha fazla seçenek ekranda.');
  }

  chunks.push("Örneğin B'den 3 lahmacun, kapıda kredi kartı de.");
  gastroSpeakSequence(chunks, { onDone });
}

/** @deprecated gastroSpeakVoiceSearchResults kullan */
export function gastroSpeakSearchResultCount(count: number): void {
  gastroSpeakVoiceSearchResults(count, []);
}
