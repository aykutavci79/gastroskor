import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { GastroColors } from '@/constants/theme';
import { buildGastroSpeechStartOptions } from '@/lib/gastro-speech-options';
import {
  getSpeechRecognitionNative,
  readRecognitionAvailable,
} from '@/lib/speech-recognition-native';

type Props = {
  /** isFinal=true yalnizca dinleme oturumu bittiginde (sessizlik veya tekrar dokunma). */
  onTranscript: (text: string, isFinal: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
  /** false iken native STT dinleyicileri mount edilmez (sheet kapanirken crash onlemi). */
  active?: boolean;
};

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function GastroVoiceMicButtonImpl({
  onTranscript,
  disabled = false,
  compact = false,
}: Omit<Props, 'active'>) {
  const [listening, setListening] = useState(false);
  const [available, setAvailable] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const lastTranscriptRef = useRef('');
  const speech = getSpeechRecognitionNative();

  useEffect(() => {
    if (isExpoGo || !speech) {
      setAvailable(false);
      return;
    }
    setAvailable(readRecognitionAvailable(speech));
  }, [speech]);

  useEffect(() => {
    if (!speech) return;

    const finishSession = () => {
      setListening(false);
      const text = lastTranscriptRef.current.trim();
      if (text) onTranscript(text, true);
    };

    const subs = [
      speech.addListener('start', () => {
        lastTranscriptRef.current = '';
        setListening(true);
        setHint(null);
      }),
      speech.addListener('end', finishSession),
      speech.addListener('result', (event) => {
        const text = event.results[0]?.transcript?.trim();
        if (!text) return;
        lastTranscriptRef.current = text;
        onTranscript(text, false);
      }),
      speech.addListener('error', (event) => {
        setListening(false);
        if (event.error === 'not-allowed') {
          setHint('Mikrofon izni gerekli.');
          return;
        }
        if (event.error === 'no-speech') {
          setHint('Ses duyulmadi. Tekrar dokunup tum cumleyi soyleyin.');
          return;
        }
        if (event.error === 'aborted') return;
        setHint('Ses tanima basarisiz. Metin ile deneyin.');
      }),
    ];

    return () => {
      subs.forEach((sub) => sub.remove());
      try {
        speech.stop();
      } catch {
        /* native modul */
      }
    };
  }, [onTranscript, speech]);

  const startListening = useCallback(async () => {
    if (disabled || isExpoGo || !speech) {
      setHint('Mikrofon TestFlight / Play build gerektirir.');
      return;
    }
    if (!available) {
      setHint('Bu cihazda ses tanima kullanilamiyor.');
      return;
    }
    if (listening) {
      try {
        speech.stop();
      } catch {
        setListening(false);
      }
      return;
    }

    setHint(null);
    lastTranscriptRef.current = '';
    try {
      const permission = await speech.requestPermissionsAsync();
      if (!permission.granted) {
        setHint('Mikrofon ve konusma tanima izni gerekli.');
        return;
      }
      speech.start(buildGastroSpeechStartOptions());
    } catch {
      setHint('Ses tanima baslatilamadi. Metin ile deneyin.');
      setListening(false);
    }
  }, [available, disabled, listening, speech]);

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
          <Text style={styles.label}>
            {listening ? 'Dinleniyor… (bitir: tekrar dokun)' : 'Konus'}
          </Text>
        ) : null}
      </Pressable>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {listening && compact ? (
        <Text style={styles.hintCompact}>Bitirmek icin tekrar dokun</Text>
      ) : null}
    </>
  );
}

export function GastroVoiceMicButton({
  active = true,
  onTranscript,
  disabled = false,
  compact = false,
}: Props) {
  if (!active) {
    return (
      <Pressable
        style={[styles.btn, compact && styles.btnCompact, styles.btnDisabled]}
        disabled>
        <Text style={styles.emoji}>🎙️</Text>
      </Pressable>
    );
  }

  return (
    <GastroVoiceMicButtonImpl
      onTranscript={onTranscript}
      disabled={disabled}
      compact={compact}
    />
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
