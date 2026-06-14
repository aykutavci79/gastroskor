import { Audio } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';

import { releaseRecordingAudioForSpeech } from '@/lib/gastro-speak';

import {
  createVoiceSilenceVadState,
  getVoiceVadConfig,
  tickVoiceSilenceVad,
  type VoiceSilenceVadDecision,
} from '@/lib/voice-silence-vad';
import { getVoiceWhisperRecordingOptions } from '@/lib/voice-whisper-recording-options';
import { transcribeVoiceAudio } from '@/lib/voice-whisper-transcribe';

const MAX_RECORDING_MS = 45_000;

export type VoiceWhisperAutoStopReason = 'silence' | 'no_speech' | 'fallback_utterance' | 'max_duration';

function mimeFromRecordingUri(uri: string): { mimeType: string; fileName: string } {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.3gp')) return { mimeType: 'audio/3gpp', fileName: 'voice.3gp' };
  if (lower.endsWith('.webm')) return { mimeType: 'audio/webm', fileName: 'voice.webm' };
  if (lower.endsWith('.wav')) return { mimeType: 'audio/wav', fileName: 'voice.wav' };
  return { mimeType: 'audio/m4a', fileName: 'voice.m4a' };
}

export function useVoiceWhisperRecorder() {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vadStateRef = useRef(createVoiceSilenceVadState(Date.now()));
  const autoStopInFlightRef = useRef(false);
  const onAutoStopRef = useRef<((reason: VoiceWhisperAutoStopReason) => void) | null>(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const clearMaxDurationTimer = useCallback(() => {
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
  }, []);

  const detachStatusListener = useCallback((active: Audio.Recording | null) => {
    active?.setOnRecordingStatusUpdate(null);
    active?.setProgressUpdateInterval(1000);
  }, []);

  const cleanupRecording = useCallback(async () => {
    clearMaxDurationTimer();
    autoStopInFlightRef.current = false;
    const active = recordingRef.current;
    recordingRef.current = null;
    detachStatusListener(active);
    if (!active) return;
    try {
      await active.stopAndUnloadAsync();
    } catch {
      /* zaten durmus */
    }
  }, [clearMaxDurationTimer, detachStatusListener]);

  useEffect(() => {
    return () => {
      void cleanupRecording();
    };
  }, [cleanupRecording]);

  const requestMicPermission = useCallback(async () => {
    const permission = await Audio.requestPermissionsAsync();
    return permission.granted;
  }, []);

  const triggerAutoStop = useCallback((reason: VoiceWhisperAutoStopReason) => {
    if (autoStopInFlightRef.current) return;
    autoStopInFlightRef.current = true;
    onAutoStopRef.current?.(reason);
  }, []);

  const handleVadDecision = useCallback(
    (decision: VoiceSilenceVadDecision) => {
      if (decision.action !== 'auto_stop') return;
      triggerAutoStop(decision.reason);
    },
    [triggerAutoStop],
  );

  const handleRecordingStatus = useCallback(
    (status: Audio.RecordingStatus) => {
      if (!status.isRecording || autoStopInFlightRef.current) return;

      const nowMs = Date.now();
      const elapsedMs = status.durationMillis ?? nowMs - vadStateRef.current.startedAtMs;
      const pollMs = getVoiceVadConfig().statusPollMs;
      const tick = tickVoiceSilenceVad(vadStateRef.current, {
        nowMs,
        elapsedMs,
        metering: status.metering,
        pollMs,
      });
      vadStateRef.current = tick.state;
      handleVadDecision(tick.decision);
    },
    [handleVadDecision],
  );

  const startRecording = useCallback(
    async (options?: { onAutoStop?: (reason: VoiceWhisperAutoStopReason) => void }): Promise<boolean> => {
      if (recording || transcribing) return false;

      onAutoStopRef.current = options?.onAutoStop ?? null;
      autoStopInFlightRef.current = false;

      const granted = await requestMicPermission();
      if (!granted) return false;

      await cleanupRecording();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      const created = new Audio.Recording();
      await created.prepareToRecordAsync(getVoiceWhisperRecordingOptions());
      created.setProgressUpdateInterval(getVoiceVadConfig().statusPollMs);
      created.setOnRecordingStatusUpdate(handleRecordingStatus);
      await created.startAsync();

      vadStateRef.current = createVoiceSilenceVadState(Date.now());
      recordingRef.current = created;
      setRecording(true);

      clearMaxDurationTimer();
      maxDurationTimerRef.current = setTimeout(() => {
        maxDurationTimerRef.current = null;
        triggerAutoStop('max_duration');
      }, MAX_RECORDING_MS);

      return true;
    },
    [
      cleanupRecording,
      clearMaxDurationTimer,
      handleRecordingStatus,
      recording,
      requestMicPermission,
      transcribing,
      triggerAutoStop,
    ],
  );

  const stopAndTranscribe = useCallback(async (): Promise<string> => {
    if (transcribing) return '';

    clearMaxDurationTimer();
    autoStopInFlightRef.current = false;
    onAutoStopRef.current = null;

    const active = recordingRef.current;
    recordingRef.current = null;
    detachStatusListener(active);
    setRecording(false);

    if (!active) {
      return '';
    }

    setTranscribing(true);
    try {
      await active.stopAndUnloadAsync();
      await releaseRecordingAudioForSpeech();
      const uri = active.getURI();
      if (!uri) {
        throw new Error('Kayit dosyasi bulunamadi.');
      }
      const { mimeType, fileName } = mimeFromRecordingUri(uri);
      const result = await transcribeVoiceAudio(uri, mimeType, fileName);
      return result.text.trim();
    } finally {
      setTranscribing(false);
    }
  }, [clearMaxDurationTimer, detachStatusListener, transcribing]);

  const cancelRecording = useCallback(async () => {
    onAutoStopRef.current = null;
    await cleanupRecording();
    await releaseRecordingAudioForSpeech();
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
