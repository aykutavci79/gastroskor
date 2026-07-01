import { Audio } from 'expo-av';

import { applySpeakerPlaybackMode } from '@/lib/gastro-audio-session';

const RESERVATION_TRACKS = [
  require('@/assets/audio/gastro/rezervasyon.mp3'),
  require('@/assets/audio/gastro/rezervasyon1.mp3'),
  require('@/assets/audio/gastro/rezervasyon2.mp3'),
  require('@/assets/audio/gastro/rezervasyon3.mp3'),
  require('@/assets/audio/gastro/rezervasyon4.mp3'),
] as const;

const AMBIENCE_VOLUME = 0.29;

let activeSound: Audio.Sound | null = null;
let playlistActive = false;
let lastTrackIndex = -1;
let playingNext = false;
let stopTimer: ReturnType<typeof setTimeout> | null = null;

const STOP_DEBOUNCE_MS = 320;

function pickRandomTrackIndex(): number {
  if (RESERVATION_TRACKS.length <= 1) return 0;
  let index = Math.floor(Math.random() * RESERVATION_TRACKS.length);
  while (index === lastTrackIndex) {
    index = Math.floor(Math.random() * RESERVATION_TRACKS.length);
  }
  return index;
}

async function unloadActiveSound(): Promise<void> {
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

async function playNextTrack(): Promise<void> {
  if (!playlistActive || playingNext) return;
  playingNext = true;

  try {
    await unloadActiveSound();
    if (!playlistActive) return;

    const trackIndex = pickRandomTrackIndex();
    lastTrackIndex = trackIndex;
    await applySpeakerPlaybackMode();

    const { sound } = await Audio.Sound.createAsync(RESERVATION_TRACKS[trackIndex], {
      volume: AMBIENCE_VOLUME,
      isLooping: false,
      shouldPlay: false,
    });

    if (!playlistActive) {
      await sound.unloadAsync().catch(() => undefined);
      return;
    }

    activeSound = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded || !status.didJustFinish || !playlistActive) return;
      void playNextTrack();
    });
    await sound.playAsync();
  } catch {
    activeSound = null;
    if (playlistActive) {
      setTimeout(() => {
        void playNextTrack();
      }, 900);
    }
  } finally {
    playingNext = false;
  }
}

async function stopReservationAmbienceNow(): Promise<void> {
  playlistActive = false;
  lastTrackIndex = -1;
  await unloadActiveSound();
}

export async function stopReservationAmbience(): Promise<void> {
  if (stopTimer) return;
  stopTimer = setTimeout(() => {
    stopTimer = null;
    void stopReservationAmbienceNow();
  }, STOP_DEBOUNCE_MS);
}

export async function startReservationAmbience(): Promise<void> {
  if (stopTimer) {
    clearTimeout(stopTimer);
    stopTimer = null;
  }
  if (playlistActive) return;
  playlistActive = true;
  lastTrackIndex = -1;
  await playNextTrack();
}

export function isReservationAmbiencePlaying(): boolean {
  return playlistActive && activeSound != null;
}
