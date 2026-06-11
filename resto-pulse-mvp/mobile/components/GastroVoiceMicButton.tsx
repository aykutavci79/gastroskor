import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { GastroColors } from '@/constants/theme';
import { buildGastroSpeechStartOptions } from '@/lib/gastro-speech-options';
import { mergeSpeechTranscript } from '@/lib/merge-speech-transcript';
import {
  getSpeechRecognitionNative,
  readRecognitionAvailable,
} from '@/lib/speech-recognition-native';

const RESTART_DELAY_MS = 450;

type Props = {
  /** isFinal=true yalnizca kullanici durdurunca veya active=false olunca. */
  onTranscript: (text: string, isFinal: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
  /** false olunca dinleme durdurulur (arama tamamlandi vb.). */
  active?: boolean;
};

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function GastroVoiceMicButtonImpl({
  onTranscript,
  disabled = false,
  compact = false,
  active = true,
}: Props) {
  const [listening, setListening] = useState(false);
  const [available, setAvailable] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const lastTranscriptRef = useRef('');
  const userStoppedRef = useRef(true);
  const isAutoRestartRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speech = getSpeechRecognitionNative();

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const finishSession = useCallback(() => {
    clearRestartTimer();
    setListening(false);
    const text = lastTranscriptRef.current.trim();
    if (text) onTranscript(text, true);
  }, [clearRestartTimer, onTranscript]);

  const restartListening = useCallback(() => {
    if (!speech || userStoppedRef.current) return;
    try {
      isAutoRestartRef.current = true;
      speech.start(buildGastroSpeechStartOptions());
    } catch {
      finishSession();
    }
  }, [finishSession, speech]);

  useEffect(() => {
    if (isExpoGo || !speech) {
      setAvailable(false);
      return;
    }
    setAvailable(readRecognitionAvailable(speech));
  }, [speech]);

  useEffect(() => {
    if (active) return;
    userStoppedRef.current = true;
    clearRestartTimer();
    if (!speech) {
      setListening(false);
      return;
    }
    try {
      speech.stop();
    } catch {
      finishSession();
    }
  }, [active, clearRestartTimer, finishSession, speech]);

  useEffect(() => {
    if (!speech) return;

    const subs = [
      speech.addListener('start', () => {
        if (!isAutoRestartRef.current) {
          lastTranscriptRef.current = '';
        }
        isAutoRestartRef.current = false;
        setListening(true);
        setHint(null);
      }),
      speech.addListener('end', () => {
        if (userStoppedRef.current) {
          finishSession();
          return;
        }
        clearRestartTimer();
        restartTimerRef.current = setTimeout(() => {
          restartTimerRef.current = null;
          if (userStoppedRef.current) {
            finishSession();
            return;
          }
          restartListening();
        }, RESTART_DELAY_MS);
      }),
      speech.addListener('result', (event) => {
        const text = event.results[0]?.transcript?.trim();
        if (!text) return;
        lastTranscriptRef.current = mergeSpeechTranscript(lastTranscriptRef.current, text);
        onTranscript(lastTranscriptRef.current, false);
      }),
      speech.addListener('error', (event) => {
        clearRestartTimer();
        if (!userStoppedRef.current && event.error === 'no-speech') {
          restartTimerRef.current = setTimeout(() => {
            restartTimerRef.current = null;
            restartListening();
          }, RESTART_DELAY_MS);
          return;
        }
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
      userStoppedRef.current = true;
      clearRestartTimer();
      subs.forEach((sub) => sub.remove());
      try {
        speech.stop();
      } catch {
        /* native modul */
      }
    };
  }, [
    clearRestartTimer,
    finishSession,
    onTranscript,
    restartListening,
    speech,
  ]);

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
      userStoppedRef.current = true;
      clearRestartTimer();
      try {
        speech.stop();
      } catch {
        finishSession();
      }
      return;
    }

    setHint(null);
    userStoppedRef.current = false;
    lastTranscriptRef.current = '';
    try {
      const permission = await speech.requestPermissionsAsync();
      if (!permission.granted) {
        setHint('Mikrofon ve konusma tanima izni gerekli.');
        return;
      }
      speech.start(buildGastroSpeechStartOptions());
    } catch {
      userStoppedRef.current = true;
      setHint('Ses tanima baslatilamadi. Metin ile deneyin.');
      setListening(false);
    }
  }, [
    available,
    clearRestartTimer,
    disabled,
    finishSession,
    listening,
    speech,
  ]);

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
  return (
    <GastroVoiceMicButtonImpl
      active={active}
      onTranscript={onTranscript}
      disabled={disabled || !active}
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
