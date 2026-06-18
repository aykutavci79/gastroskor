import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { InteractionManager, Platform } from 'react-native';

export const IOS_PLAYBACK_SETTLE_MS = 320;
export const IOS_RECORDING_HANDOFF_MS = 360;

type IosAudioSessionModule = {
  setCategoryIOS: (options: {
    category: string;
    categoryOptions: string[];
    mode?: string;
  }) => void;
  setAudioSessionActiveIOS?: (
    value: boolean,
    options?: { notifyOthersOnDeactivation?: boolean },
  ) => void;
  getAudioSessionCategoryAndOptionsIOS?: () => {
    category: string;
    categoryOptions: string[];
    mode: string;
  };
};

function getIosAudioSessionModule(): IosAudioSessionModule | null {
  if (Platform.OS !== 'ios') return null;
  try {
    const { ExpoSpeechRecognitionModule } = require('expo-speech-recognition') as {
      ExpoSpeechRecognitionModule?: IosAudioSessionModule;
    };
    if (typeof ExpoSpeechRecognitionModule?.setCategoryIOS === 'function') {
      return ExpoSpeechRecognitionModule;
    }
  } catch {
    /* native modul yok (Expo Go vb.) */
  }
  return null;
}

/** iOS: playAndRecord sonrasi ahize yerine ana hoparlor / playback kategorisi. */
async function applyIosSpeakerRoute(mode: 'playback' | 'recording'): Promise<void> {
  const mod = getIosAudioSessionModule();
  if (!mod) return;

  try {
    if (mode === 'playback') {
      mod.setAudioSessionActiveIOS?.(false, { notifyOthersOnDeactivation: true });
      await delay(60);
      mod.setCategoryIOS({
        category: 'playback',
        categoryOptions: [],
        mode: 'default',
      });
      mod.setAudioSessionActiveIOS?.(true, { notifyOthersOnDeactivation: true });
      return;
    }

    mod.setCategoryIOS({
      category: 'playAndRecord',
      categoryOptions: ['defaultToSpeaker', 'allowBluetooth'],
      mode: 'measurement',
    });
    mod.setAudioSessionActiveIOS?.(true, { notifyOthersOnDeactivation: true });
  } catch {
    /* AVAudioSession baska modul tarafindan kilitli olabilir */
  }
}

/** EAS / TestFlight debug — mevcut iOS ses oturumu. */
export function readIosAudioSessionDebug(): string | null {
  if (Platform.OS !== 'ios') return null;
  const mod = getIosAudioSessionModule();
  if (!mod?.getAudioSessionCategoryAndOptionsIOS) return null;
  try {
    const state = mod.getAudioSessionCategoryAndOptionsIOS();
    return `${state.category} [${state.categoryOptions.join(', ')}] mode=${state.mode}`;
  } catch {
    return null;
  }
}

const PLAYBACK_MODE = {
  allowsRecordingIOS: false,
  playsInSilentModeIOS: true,
  staysActiveInBackground: false,
  interruptionModeIOS: InterruptionModeIOS.DoNotMix,
  interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
  shouldDuckAndroid: false,
  playThroughEarpieceAndroid: false,
} as const;

const RECORDING_MODE = {
  allowsRecordingIOS: true,
  playsInSilentModeIOS: true,
  staysActiveInBackground: false,
  interruptionModeIOS: InterruptionModeIOS.DoNotMix,
  interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
  shouldDuckAndroid: true,
  playThroughEarpieceAndroid: false,
} as const;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function awaitIosNavigationSettled(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  await new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      void delay(140).then(resolve);
    });
  });
}

/** Hoparlor / medya oynatma oturumu — Gamze mp3 ve cihaz TTS. */
export async function applySpeakerPlaybackMode(): Promise<void> {
  try {
    await Audio.setAudioModeAsync(PLAYBACK_MODE);
    if (Platform.OS === 'ios') {
      await delay(IOS_PLAYBACK_SETTLE_MS);
      await applyIosSpeakerRoute('playback');
    }
  } catch {
    /* ses modu opsiyonel */
  }
}

/** Mikrofon kaydi oturumu. */
export async function applyRecordingAudioMode(): Promise<void> {
  try {
    await Audio.setAudioModeAsync(RECORDING_MODE);
    if (Platform.OS === 'ios') {
      await applyIosSpeakerRoute('recording');
    }
  } catch {
    /* ses modu opsiyonel */
  }
}

/** Kayit sonrasi ahize yonlendirmesini sifirla, hoparlor moduna gec. */
export async function handoffRecordingToPlayback(): Promise<void> {
  try {
    await Audio.setAudioModeAsync(PLAYBACK_MODE);
    const handoffMs = Platform.OS === 'ios' ? IOS_RECORDING_HANDOFF_MS : 220;
    await delay(handoffMs);
    if (Platform.OS === 'ios') {
      await applyIosSpeakerRoute('playback');
    }
  } catch {
    /* kayit oturumu zaten kapali olabilir */
  }
  await applySpeakerPlaybackMode();
}
