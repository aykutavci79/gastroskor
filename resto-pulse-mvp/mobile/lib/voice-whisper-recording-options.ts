import { Audio } from 'expo-av';

export const VOICE_WHISPER_STATUS_POLL_MS = 120;

export function getVoiceWhisperRecordingOptions(): Audio.RecordingOptions {
  return {
    ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  };
}
