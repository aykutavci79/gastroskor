import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

import { VOICE_CONTEXT_PHRASES } from '@/constants/voice-product-catalog';
import { GastroColors } from '@/constants/theme';

type Props = {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  compact?: boolean;
};

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export function GastroVoiceMicButton({ onTranscript, disabled = false, compact = false }: Props) {
  const [listening, setListening] = useState(false);
  const [available, setAvailable] = useState(!isExpoGo);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (isExpoGo) return;
    void ExpoSpeechRecognitionModule.isRecognitionAvailable().then(setAvailable);
  }, []);

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => setListening(false));
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript?.trim();
    if (text) onTranscript(text);
    if (event.isFinal) setListening(false);
  });
  useSpeechRecognitionEvent('error', (event) => {
    setListening(false);
    if (event.error === 'not-allowed') {
      setHint('Mikrofon izni gerekli.');
      return;
    }
    setHint('Ses tanima basarisiz. Metin ile deneyin.');
  });

  const startListening = useCallback(async () => {
    if (disabled || isExpoGo) {
      setHint('Mikrofon TestFlight / Play build gerektirir.');
      return;
    }
    if (!available) {
      setHint('Bu cihazda ses tanima kullanilamiyor.');
      return;
    }
    setHint(null);
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setHint('Mikrofon ve konusma tanima izni gerekli.');
      return;
    }
    if (listening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    ExpoSpeechRecognitionModule.start({
      lang: 'tr-TR',
      interimResults: true,
      continuous: false,
      maxAlternatives: 1,
      contextualStrings: VOICE_CONTEXT_PHRASES.slice(0, 40),
    });
  }, [available, disabled, listening]);

  return (
    <>
      <Pressable
        style={[
          styles.btn,
          compact && styles.btnCompact,
          listening && styles.btnActive,
          (disabled || !available) && styles.btnDisabled,
        ]}
        onPress={() => void startListening()}
        disabled={disabled}>
        {listening ? (
          <ActivityIndicator color="#141414" size="small" />
        ) : (
          <Text style={styles.emoji}>🎙️</Text>
        )}
        {!compact ? (
          <Text style={styles.label}>{listening ? 'Dinleniyor…' : 'Konus'}</Text>
        ) : null}
      </Pressable>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
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
});
