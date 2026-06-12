import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { GastroColors } from '@/constants/theme';
import { useVoiceWhisperRecorder } from '@/hooks/use-voice-whisper-recorder';

type Props = {
  onTranscript: (text: string, isFinal: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
  active?: boolean;
};

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export function GastroVoiceMicButtonWhisper({
  onTranscript,
  disabled = false,
  compact = false,
  active = true,
}: Props) {
  const [hint, setHint] = useState<string | null>(null);
  const { recording, transcribing, startRecording, stopAndTranscribe, cancelRecording } =
    useVoiceWhisperRecorder();

  useEffect(() => {
    if (active) return;
    void cancelRecording();
  }, [active, cancelRecording]);

  const handlePress = useCallback(async () => {
    if (disabled || isExpoGo) {
      setHint('Mikrofon TestFlight / Play build gerektirir.');
      return;
    }
    if (transcribing) return;

    if (recording) {
      try {
        setHint('Cevriliyor…');
        const text = await stopAndTranscribe();
        setHint(null);
        if (text) {
          onTranscript(text, false);
          onTranscript(text, true);
        } else {
          setHint('Ses duyulmadi. Tekrar dokunup tum cumleyi soyleyin.');
        }
      } catch (err) {
        setHint(err instanceof Error ? err.message : 'Ses tanima basarisiz. Metin ile deneyin.');
      }
      return;
    }

    setHint(null);
    const started = await startRecording();
    if (!started) {
      setHint('Mikrofon izni gerekli.');
    }
  }, [disabled, onTranscript, recording, startRecording, stopAndTranscribe, transcribing]);

  const busy = recording || transcribing;

  return (
    <>
      <Pressable
        style={[
          styles.btn,
          compact && styles.btnCompact,
          recording && styles.btnActive,
          (disabled || transcribing) && styles.btnDisabled,
        ]}
        onPress={() => void handlePress()}
        disabled={disabled || transcribing}>
        {transcribing ? (
          <ActivityIndicator color="#141414" size="small" />
        ) : (
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
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {busy && compact && !transcribing ? (
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
