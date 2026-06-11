import { requireOptionalNativeModule } from 'expo';

import type {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';

type SpeechEvents = {
  start: () => void;
  end: () => void;
  result: (event: ExpoSpeechRecognitionResultEvent) => void;
  error: (event: ExpoSpeechRecognitionErrorEvent) => void;
};

export type SpeechRecognitionNative = {
  start: (options: Record<string, unknown>) => void;
  stop: () => void;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  isRecognitionAvailable: () => boolean;
  addListener: <K extends keyof SpeechEvents>(
    eventName: K,
    listener: SpeechEvents[K],
  ) => { remove: () => void };
};

let cached: SpeechRecognitionNative | null | undefined;

/** Native STT modulu — yoksa null (Expo Go / hatali build). */
export function getSpeechRecognitionNative(): SpeechRecognitionNative | null {
  if (cached !== undefined) return cached;
  try {
    const mod = requireOptionalNativeModule<SpeechRecognitionNative>('ExpoSpeechRecognition');
    if (
      !mod ||
      typeof mod.start !== 'function' ||
      typeof mod.addListener !== 'function' ||
      typeof mod.isRecognitionAvailable !== 'function'
    ) {
      cached = null;
      return null;
    }
    cached = mod;
    return mod;
  } catch {
    cached = null;
    return null;
  }
}

/** API surumu: boolean veya (eski) Promise dondurur. */
export function readRecognitionAvailable(mod: SpeechRecognitionNative): boolean {
  try {
    const value = mod.isRecognitionAvailable();
    if (typeof value === 'boolean') return value;
    return Boolean(value);
  } catch {
    return false;
  }
}
