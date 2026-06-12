import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { GastroColors } from '@/constants/theme';
import { useVoiceWhisperRecorder } from '@/hooks/use-voice-whisper-recorder';

import type { VoiceMicUiState } from '@/components/GastroVoiceMicButton';

const AUTO_START_DELAY_MS = 450;

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
  const { recording, transcribing, startRecording, stopAndTranscribe, cancelRecording } =
    useVoiceWhisperRecorder();

  const updateHint = useCallback(
    (next: string | null) => {
      setHint(next);
      onHintChange?.(next);
    },
    [onHintChange],
  );

  useEffect(() => {
    if (active) return;
    autoStartedRef.current = false;
    void cancelRecording();
  }, [active, cancelRecording]);

  const beginRecording = useCallback(async () => {
    updateHint(null);
    const started = await startRecording();
    if (!started) {
      updateHint('Mikrofon izni gerekli.');
      autoStartedRef.current = false;
    }
  }, [startRecording, updateHint]);

  useEffect(() => {
    if (!autoStart || !active || disabled || isExpoGo || autoStartedRef.current || recording) return;

    const timer = setTimeout(() => {
      if (autoStartedRef.current || recording) return;
      autoStartedRef.current = true;
      void beginRecording();
    }, AUTO_START_DELAY_MS);

    return () => clearTimeout(timer);
  }, [active, autoStart, beginRecording, disabled, recording]);

  const handlePress = useCallback(async () => {
    if (disabled || isExpoGo) {
      updateHint('Mikrofon TestFlight / Play build gerektirir.');
      return;
    }
    if (transcribing) return;

    if (recording) {
      try {
        updateHint('Cevriliyor…');
        const text = await stopAndTranscribe();
        updateHint(null);
        if (text) {
          onTranscript(text, false);
          onTranscript(text, true);
        } else {
          updateHint('Ses duyulmadi. Tekrar dokunup tum cumleyi soyleyin.');
          autoStartedRef.current = false;
        }
      } catch (err) {
        updateHint(err instanceof Error ? err.message : 'Ses tanima basarisiz. Metin ile deneyin.');
        autoStartedRef.current = false;
      }
      return;
    }

    autoStartedRef.current = true;
    await beginRecording();
  }, [beginRecording, disabled, onTranscript, recording, stopAndTranscribe, transcribing, updateHint]);

  const busy = recording || transcribing;

  useEffect(() => {
    onUiStateChange?.({ listening: recording, transcribing });
  }, [onUiStateChange, recording, transcribing]);

  const showCompactHint = compact && !overlayCompact && busy && !transcribing;
  const showInlineHint = hint && !overlayCompact;

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
          recording
            ? 'Dinlemeyi bitirmek icin tekrar dokun'
            : 'Konusmak icin dokun, bitirince tekrar dokun'
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
                ? 'Dinleniyor… (bitir: tekrar dokun)'
                : 'Konus'}
          </Text>
        ) : null}
      </Pressable>
      {showInlineHint ? <Text style={styles.hint}>{hint}</Text> : null}
      {showCompactHint ? (
        <Text style={styles.hintCompact}>Bitirmek icin tekrar dokun</Text>
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
