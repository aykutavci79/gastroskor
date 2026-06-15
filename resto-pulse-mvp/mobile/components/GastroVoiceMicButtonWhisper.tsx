import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text } from 'react-native';

import { GastroColors } from '@/constants/theme';
import { waitForGastroAudioCueIdle } from '@/lib/gastro-audio-cues';
import { gastroStopTtsOnly } from '@/lib/gastro-speak';
import {
  useVoiceWhisperRecorder,
  type VoiceWhisperAutoStopReason,
} from '@/hooks/use-voice-whisper-recorder';

import type { VoiceMicUiState } from '@/components/GastroVoiceMicButton';
import {
  voiceMicCompactRecordingHint,
  voiceMicIdleAccessibilityHint,
  voiceMicRecordingAccessibilityHint,
  voiceMicRecordingLabel,
} from '@/lib/voice-mic-copy';

const AUTO_START_DELAY_MS = Platform.OS === 'android' ? 520 : 380;

type Props = {
  onTranscript: (text: string, isFinal: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
  overlayCompact?: boolean;
  active?: boolean;
  autoStart?: boolean;
  onUiStateChange?: (state: VoiceMicUiState) => void;
  onHintChange?: (hint: string | null) => void;
};

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export function GastroVoiceMicButtonWhisper({
  onTranscript,
  disabled = false,
  compact = false,
  overlayCompact = false,
  active = true,
  autoStart = false,
  onUiStateChange,
  onHintChange,
}: Props) {
  const [hint, setHint] = useState<string | null>(null);
  const autoStartedRef = useRef(false);
  const finishingRef = useRef(false);
  const { recording, transcribing, startRecording, stopAndTranscribe, cancelRecording } =
    useVoiceWhisperRecorder();

  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const updateHint = useCallback(
    (next: string | null) => {
      setHint(next);
      onHintChange?.(next);
    },
    [onHintChange],
  );

  const finishRecording = useCallback(async () => {
    if (finishingRef.current || transcribing) return;
    finishingRef.current = true;
    autoStartedRef.current = true;
    try {
      updateHint('Cevriliyor…');
      const text = await stopAndTranscribe();
      updateHint(null);
      if (text) {
        onTranscriptRef.current(text, false);
        onTranscriptRef.current(text, true);
      } else {
        updateHint('Ses duyulmadi. Tekrar dokunup tum cumleyi soyleyin.');
        autoStartedRef.current = false;
      }
    } catch (err) {
      updateHint(err instanceof Error ? err.message : 'Ses tanima basarisiz. Metin ile deneyin.');
      autoStartedRef.current = false;
    } finally {
      finishingRef.current = false;
    }
  }, [stopAndTranscribe, transcribing, updateHint]);

  const finishRecordingRef = useRef(finishRecording);
  finishRecordingRef.current = finishRecording;

  const handleAutoStop = useCallback(
    (reason: VoiceWhisperAutoStopReason) => {
      if (reason === 'no_speech') {
        void cancelRecording();
        updateHint('Ses duyulmadi. Tekrar dokunup tum cumleyi soyleyin.');
        autoStartedRef.current = false;
        return;
      }
      void finishRecordingRef.current();
    },
    [cancelRecording, updateHint],
  );

  useEffect(() => {
    if (active) return;
    autoStartedRef.current = false;
    finishingRef.current = false;
    void cancelRecording();
  }, [active, cancelRecording]);

  const beginRecording = useCallback(async () => {
    await waitForGastroAudioCueIdle();
    gastroStopTtsOnly();
    updateHint(null);
    const started = await startRecording({ onAutoStop: handleAutoStop });
    if (!started) {
      updateHint('Mikrofon izni gerekli.');
      autoStartedRef.current = false;
    }
  }, [handleAutoStop, startRecording, updateHint]);

  useEffect(() => {
    if (
      !autoStart ||
      !active ||
      disabled ||
      isExpoGo ||
      autoStartedRef.current ||
      recording ||
      transcribing ||
      finishingRef.current
    ) {
      return;
    }

    const timer = setTimeout(() => {
      if (
        autoStartedRef.current ||
        recording ||
        transcribing ||
        finishingRef.current ||
        !active
      ) {
        return;
      }
      autoStartedRef.current = true;
      void beginRecording();
    }, AUTO_START_DELAY_MS);

    return () => clearTimeout(timer);
  }, [active, autoStart, beginRecording, disabled, recording, transcribing]);

  const handlePress = useCallback(async () => {
    if (disabled || isExpoGo) {
      updateHint('Mikrofon TestFlight / Play build gerektirir.');
      return;
    }
    if (transcribing || finishingRef.current) return;

    if (recording) {
      await finishRecording();
      return;
    }

    autoStartedRef.current = true;
    await beginRecording();
  }, [beginRecording, disabled, finishRecording, recording, transcribing, updateHint]);

  const busy = recording || transcribing;

  useEffect(() => {
    onUiStateChange?.({ listening: recording, transcribing });
  }, [onUiStateChange, recording, transcribing]);

  const showCompactHint = compact && !overlayCompact && busy && !transcribing;
  const showInlineHint = hint && !overlayCompact && !compact;

  return (
    <>
      <Pressable
        style={[
          styles.btn,
          compact && styles.btnCompact,
          overlayCompact && styles.btnOverlay,
          recording && styles.btnActive,
          overlayCompact && !recording && !transcribing && styles.btnOverlayIdle,
          (disabled || transcribing) && styles.btnDisabled,
        ]}
        onPress={() => void handlePress()}
        disabled={disabled || transcribing}
        hitSlop={overlayCompact ? 12 : undefined}
        accessibilityRole="button"
        accessibilityLabel="Sesli arama"
        accessibilityHint={
          recording ? voiceMicRecordingAccessibilityHint() : voiceMicIdleAccessibilityHint()
        }>
        {transcribing ? (
          <ActivityIndicator color="#141414" size="small" />
        ) : recording ? (
          <ActivityIndicator color="#141414" size="small" />
        ) : overlayCompact ? null : (
          <Text style={styles.emoji}>🎙️</Text>
        )}
        {!compact ? (
          <Text style={styles.label}>
            {transcribing
              ? 'Cevriliyor…'
              : recording
                ? voiceMicRecordingLabel()
                : 'Konus'}
          </Text>
        ) : null}
      </Pressable>
      {showInlineHint ? <Text style={styles.hint}>{hint}</Text> : null}
      {showCompactHint ? (
        <Text style={styles.hintCompact}>{voiceMicCompactRecordingHint()}</Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.55)',
    backgroundColor: 'rgba(255,107,53,0.14)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  btnCompact: {
    minWidth: 48,
    minHeight: 48,
    paddingHorizontal: 10,
  },
  btnOverlay: {
    width: 120,
    height: 120,
    minWidth: 120,
    minHeight: 120,
    borderRadius: 60,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  btnOverlayIdle: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  btnActive: {
    backgroundColor: GastroColors.gold,
    borderColor: GastroColors.gold,
  },
  btnDisabled: { opacity: 0.5 },
  emoji: { fontSize: 18 },
  label: { color: GastroColors.text, fontWeight: '800', fontSize: 14 },
  hint: { color: GastroColors.gold, fontSize: 11, lineHeight: 15, marginTop: 4 },
  hintCompact: {
    color: GastroColors.muted,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
    textAlign: 'center',
  },
});
