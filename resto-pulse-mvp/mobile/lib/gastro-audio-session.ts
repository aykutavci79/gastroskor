import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { InteractionManager, Platform } from 'react-native';

export const IOS_PLAYBACK_SETTLE_MS = 320;
export const IOS_RECORDING_HANDOFF_MS = 360;

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
    }
  } catch {
    /* ses modu opsiyonel */
  }
}

/** Mikrofon kaydi oturumu. */
export async function applyRecordingAudioMode(): Promise<void> {
  try {
    await Audio.setAudioModeAsync(RECORDING_MODE);
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
  } catch {
    /* kayit oturumu zaten kapali olabilir */
  }
  await applySpeakerPlaybackMode();
}
