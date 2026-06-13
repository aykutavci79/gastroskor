import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

const TR_LOCALE = 'tr-TR';

type SpeechVoice = Awaited<ReturnType<typeof Speech.getAvailableVoicesAsync>>[number];

let cachedVoiceId: string | null | undefined;
let resolvePromise: Promise<string | null> | null = null;

function scoreTurkishVoice(voice: SpeechVoice): number {
  const lang = (voice.language ?? '').toLowerCase();
  if (!lang.startsWith('tr')) return -1;

  let score = 0;
  const id = (voice.identifier ?? '').toLowerCase();
  const name = (voice.name ?? '').toLowerCase();

  if (lang === 'tr-tr') score += 12;
  if (voice.quality === 'Enhanced') score += 24;

  if (Platform.OS === 'android') {
    // Google TTS neural / local Turkce sesleri
    if (/tr-tr-x-/.test(id)) score += 40;
    if (id.includes('trf') || id.includes('trd')) score += 18;
    if (id.includes('google')) score += 12;
    if (id.includes('local')) score += 8;
    // Cok dusuk kaliteli varsayilan motor
    if (id.endsWith('-language') || name.endsWith('-language')) score -= 60;
  } else if (Platform.OS === 'ios') {
    if (id.includes('yelda')) score += 28;
    if (id.includes('premium')) score += 16;
    if (id.includes('enhanced')) score += 12;
    if (id.includes('compact')) score += 6;
  }

  return score;
}

/** Cihazdaki en iyi Turkce TTS sesini sec (Android'de Google neural oncelikli). */
export async function resolveTurkishTtsVoiceId(): Promise<string | null> {
  if (cachedVoiceId !== undefined) return cachedVoiceId;
  if (resolvePromise) return resolvePromise;

  resolvePromise = Speech.getAvailableVoicesAsync()
    .then((voices) => {
      const ranked = voices
        .map((voice) => ({ voice, score: scoreTurkishVoice(voice) }))
        .filter((row) => row.score >= 0)
        .sort((a, b) => b.score - a.score);

      cachedVoiceId = ranked[0]?.voice.identifier ?? null;
      return cachedVoiceId;
    })
    .catch(() => {
      cachedVoiceId = null;
      return null;
    })
    .finally(() => {
      resolvePromise = null;
    });

  return resolvePromise;
}

export function prefetchTurkishTtsVoice(): void {
  void resolveTurkishTtsVoiceId();
}

export function ttsSpeechRate(): number {
  if (Platform.OS === 'android') return 0.88;
  return 0.95;
}

export function ttsSpeechPitch(): number {
  if (Platform.OS === 'android') return 1;
  return 1.05;
}

export function ttsLocale(): string {
  return TR_LOCALE;
}
