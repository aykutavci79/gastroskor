import { Platform } from 'react-native';

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
  requestPermissionsAsync: () => Promise<{ granted: boolean }> | { granted: boolean };
  isRecognitionAvailable: () => boolean | Promise<boolean>;
  addListener: <K extends keyof SpeechEvents>(
    eventName: K,
    listener: SpeechEvents[K],
  ) => { remove?: () => void } | void;
};

let cached: SpeechRecognitionNative | null | undefined;

function isUsableSpeechModule(mod: unknown): mod is SpeechRecognitionNative {
  if (!mod || typeof mod !== 'object') return false;
  const candidate = mod as SpeechRecognitionNative;
  return (
    typeof candidate.start === 'function' &&
    typeof candidate.stop === 'function' &&
    typeof candidate.requestPermissionsAsync === 'function' &&
    typeof candidate.isRecognitionAvailable === 'function' &&
    typeof candidate.addListener === 'function'
  );
}

/** Resmi Expo modulu — requireOptionalNativeModule yerine paket export'u. */
export function getSpeechRecognitionNative(): SpeechRecognitionNative | null {
  if (cached !== undefined) return cached;
  try {
    const { ExpoSpeechRecognitionModule } = require('expo-speech-recognition') as {
      ExpoSpeechRecognitionModule?: unknown;
    };
    if (!isUsableSpeechModule(ExpoSpeechRecognitionModule)) {
      cached = null;
      return null;
    }
    cached = ExpoSpeechRecognitionModule as SpeechRecognitionNative;
    return cached;
  } catch {
    cached = null;
    return null;
  }
}

/** isRecognitionAvailable boolean doner; Promise ise .then CAGIRMA — await kullan. */
export async function readRecognitionAvailable(mod: SpeechRecognitionNative): Promise<boolean> {
  try {
    const value = mod.isRecognitionAvailable();
    if (typeof value === 'boolean') return value;
    if (value != null && typeof (value as Promise<boolean>).then === 'function') {
      return await (value as Promise<boolean>);
    }
    return Boolean(value);
  } catch {
    return false;
  }
}

export async function requestSpeechPermissions(
  mod: SpeechRecognitionNative,
): Promise<{ granted: boolean }> {
  const value = mod.requestPermissionsAsync();
  if (value != null && typeof (value as Promise<{ granted: boolean }>).then === 'function') {
    return await (value as Promise<{ granted: boolean }>);
  }
  return (value as { granted: boolean }) ?? { granted: false };
}

export function addSpeechListener<K extends keyof SpeechEvents>(
  mod: SpeechRecognitionNative,
  eventName: K,
  listener: SpeechEvents[K],
): { remove: () => void } {
  try {
    const sub = mod.addListener(eventName, listener);
    if (sub && typeof sub.remove === 'function') {
      return { remove: () => sub.remove?.() };
    }
  } catch {
    /* native modul */
  }
  return { remove: () => undefined };
}

/** Android 12- continuous desteklemez; iOS'ta acik. */
export function supportsContinuousListening(): boolean {
  if (Platform.OS === 'ios') return true;
  if (Platform.OS === 'android') {
    const version = typeof Platform.Version === 'number' ? Platform.Version : Number(Platform.Version);
    return Number.isFinite(version) && version >= 33;
  }
  return false;
}
