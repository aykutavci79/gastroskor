import { Audio } from 'expo-av';

import { applySpeakerPlaybackMode } from '@/lib/gastro-audio-session';

export type HubSfxKey = 'click' | 'coin' | 'bonus' | 'finish' | 'waterdrop' | 'buzzer' | 'applause';

const HUB_SFX_FILES: Record<HubSfxKey, number> = {
  click: require('@/assets/audio/gastro/clikc.mp3'),
  coin: require('@/assets/audio/gastro/coin2.mp3'),
  bonus: require('@/assets/audio/gastro/coin2.mp3'),
  finish: require('@/assets/audio/gastro/finish.mp3'),
  waterdrop: require('@/assets/audio/gastro/waterdrop.mp3'),
  buzzer: require('@/assets/audio/gastro/buzzer.mp3'),
  applause: require('@/assets/audio/gastro/applause.mp3'),
};

const VOLUMES: Record<HubSfxKey, number> = {
  click: 0.55,
  coin: 0.85,
  bonus: 0.8,
  finish: 0.9,
  waterdrop: 0.45,
  buzzer: 0.75,
  applause: 0.8,
};

let sessionReady = false;

async function ensurePlaybackSession(): Promise<void> {
  if (sessionReady) return;
  await applySpeakerPlaybackMode();
  sessionReady = true;
}

/** Kisa UI efektleri — Gamze sesleriyle cakismaz, ust uste calabilir. */
export function playHubSfx(key: HubSfxKey): void {
  void (async () => {
    try {
      await ensurePlaybackSession();
      const { sound } = await Audio.Sound.createAsync(HUB_SFX_FILES[key], {
        volume: VOLUMES[key],
        shouldPlay: true,
      });
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          void sound.unloadAsync().catch(() => undefined);
        }
      });
    } catch {
      /* ses dosyasi yok veya cihaz sessiz */
    }
  })();
}
