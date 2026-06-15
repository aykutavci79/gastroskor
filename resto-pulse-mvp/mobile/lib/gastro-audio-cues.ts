import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { Platform } from 'react-native';

import type { GastroTtsPhraseKey } from '@/lib/gastro-tts-phrases';

/** ElevenLabs Gamze — sabit bildirim sesleri. */
const GASTRO_AUDIO_FILES: Record<GastroTtsPhraseKey, number> = {
  listening: require('@/assets/audio/gastro/dinliyorum.mp3'),
  resultsReady: require('@/assets/audio/gastro/restoranlar-siralandi.mp3'),
  noResults: require('@/assets/audio/gastro/restoran-bulamadim.mp3'),
  confirmPrompt: require('@/assets/audio/gastro/onayliyor-musun.mp3'),
  retry: require('@/assets/audio/gastro/tekrar-dene.mp3'),
};

let activeSound: Audio.Sound | null = null;

function androidPlaybackDelayMs(): number {
  return Platform.OS === 'android' ? 180 : 0;
}

async function ensureCuePlaybackMode(): Promise<void> {
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
    const delay = androidPlaybackDelayMs();
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  } catch {
    /* opsiyonel */
  }
}

export async function stopGastroAudioCue(): Promise<void> {
  const sound = activeSound;
  activeSound = null;
  if (!sound) return;
  try {
    await sound.stopAsync();
  } catch {
    /* zaten durmus */
  }
  try {
    await sound.unloadAsync();
  } catch {
    /* unload basarisiz */
  }
}

export async function playGastroAudioCue(key: GastroTtsPhraseKey): Promise<boolean> {
  await stopGastroAudioCue();
  await ensureCuePlaybackMode();

  try {
    const { sound } = await Audio.Sound.createAsync(GASTRO_AUDIO_FILES[key], {
      volume: 1,
      shouldPlay: false,
    });
    activeSound = sound;

    return await new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        if (activeSound === sound) {
          activeSound = null;
        }
        void sound.unloadAsync().catch(() => undefined);
        resolve(ok);
      };

      const safetyMs =
        Platform.OS === 'android' ? 4_500 : 3_500;
      const safetyTimer = setTimeout(() => finish(true), safetyMs);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          clearTimeout(safetyTimer);
          finish(true);
        }
      });

      void sound.playAsync().catch(() => {
        clearTimeout(safetyTimer);
        finish(false);
      });
    });
  } catch {
    return false;
  }
}

export function isGastroAudioCuePlaying(): boolean {
  return activeSound != null;
}
