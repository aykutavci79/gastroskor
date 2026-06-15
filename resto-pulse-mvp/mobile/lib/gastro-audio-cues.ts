import { Platform } from 'react-native';
import { Audio } from 'expo-av';

import { applySpeakerPlaybackMode } from '@/lib/gastro-audio-session';
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
  await applySpeakerPlaybackMode();

  try {
    const { sound } = await Audio.Sound.createAsync(GASTRO_AUDIO_FILES[key], {
      volume: 1,
      isMuted: false,
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

      const safetyMs = Platform.OS === 'android' ? 4_500 : 3_500;
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

/** Kayit baslamadan once Gamze dosyasinin bitmesini bekle. */
export function waitForGastroAudioCueIdle(timeoutMs = 6_000): Promise<void> {
  if (!activeSound) return Promise.resolve();
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const poll = () => {
      if (!activeSound || Date.now() - startedAt >= timeoutMs) {
        resolve();
        return;
      }
      setTimeout(poll, 40);
    };
    poll();
  });
}
