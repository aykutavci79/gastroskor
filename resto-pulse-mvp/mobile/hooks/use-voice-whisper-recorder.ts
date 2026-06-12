import { Audio } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';

import { transcribeVoiceAudio } from '@/lib/voice-whisper-transcribe';

const MAX_RECORDING_MS = 45_000;

export function useVoiceWhisperRecorder() {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const clearAutoStop = useCallback(() => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
  }, []);

  const cleanupRecording = useCallback(async () => {
    clearAutoStop();
    const active = recordingRef.current;
    recordingRef.current = null;
    if (!active) return;
    try {
      await active.stopAndUnloadAsync();
    } catch {
      /* zaten durmus */
    }
  }, [clearAutoStop]);

  useEffect(() => {
    return () => {
      void cleanupRecording();
    };
  }, [cleanupRecording]);

  const requestMicPermission = useCallback(async () => {
    const permission = await Audio.requestPermissionsAsync();
    return permission.granted;
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    if (recording || transcribing) return false;

    const granted = await requestMicPermission();
    if (!granted) return false;

    await cleanupRecording();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const created = new Audio.Recording();
    await created.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await created.startAsync();
    recordingRef.current = created;
    setRecording(true);

    clearAutoStop();
    autoStopTimerRef.current = setTimeout(() => {
      autoStopTimerRef.current = null;
    }, MAX_RECORDING_MS);

    return true;
  }, [cleanupRecording, clearAutoStop, recording, requestMicPermission, transcribing]);

  const stopAndTranscribe = useCallback(async (): Promise<string> => {
    if (transcribing) return '';

    clearAutoStop();
    const active = recordingRef.current;
    recordingRef.current = null;
    setRecording(false);

    if (!active) {
      return '';
    }

    setTranscribing(true);
    try {
      await active.stopAndUnloadAsync();
      const uri = active.getURI();
      if (!uri) {
        throw new Error('Kayit dosyasi bulunamadi.');
      }
      const result = await transcribeVoiceAudio(uri);
      return result.text.trim();
    } finally {
      setTranscribing(false);
    }
  }, [clearAutoStop, transcribing]);

  const cancelRecording = useCallback(async () => {
    await cleanupRecording();
    setRecording(false);
    setTranscribing(false);
  }, [cleanupRecording]);

  return {
    recording,
    transcribing,
    startRecording,
    stopAndTranscribe,
    cancelRecording,
  };
}
