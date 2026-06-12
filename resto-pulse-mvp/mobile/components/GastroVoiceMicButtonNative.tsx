import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { GastroColors } from '@/constants/theme';
import { buildGastroSpeechStartOptions } from '@/lib/gastro-speech-options';
import { mergeSpeechTranscript } from '@/lib/merge-speech-transcript';
import {
  addSpeechListener,
  getSpeechRecognitionNative,
  readRecognitionAvailable,
  requestSpeechPermissions,
} from '@/lib/speech-recognition-native';

const RESTART_DELAY_MS = 450;
const AUTO_START_DELAY_MS = 450;

import type { VoiceMicUiState } from '@/components/GastroVoiceMicButton';

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

export function GastroVoiceMicButtonNative({
  onTranscript,
  disabled = false,
  compact = false,
  overlayCompact = false,
  active = true,
  autoStart = false,
  onUiStateChange,
  onHintChange,
}: Props) {
  const [listening, setListening] = useState(false);
  const [available, setAvailable] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const autoStartedRef = useRef(false);
  const lastTranscriptRef = useRef('');
  const userStoppedRef = useRef(true);
  const isAutoRestartRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speech = getSpeechRecognitionNative();

  const updateHint = useCallback(
    (next: string | null) => {
      setHint(next);
      onHintChange?.(next);
    },
    [onHintChange],
  );

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
    let cancelled = false;
    void readRecognitionAvailable(speech).then((ok) => {
      if (!cancelled) setAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [speech]);

  useEffect(() => {
    if (active) return;
    autoStartedRef.current = false;
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
      addSpeechListener(speech, 'start', () => {
        if (!isAutoRestartRef.current) {
          lastTranscriptRef.current = '';
        }
        isAutoRestartRef.current = false;
        setListening(true);
        updateHint(null);
      }),
      addSpeechListener(speech, 'end', () => {
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
      addSpeechListener(speech, 'result', (event) => {
        const text = event.results[0]?.transcript?.trim();
        if (!text) return;
        lastTranscriptRef.current = mergeSpeechTranscript(lastTranscriptRef.current, text);
        onTranscript(lastTranscriptRef.current, false);
      }),
      addSpeechListener(speech, 'error', (event) => {
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
          updateHint('Mikrofon izni gerekli.');
          return;
        }
        if (event.error === 'no-speech') {
          updateHint('Ses duyulmadi. Tekrar dokunup tum cumleyi soyleyin.');
          return;
        }
        if (event.error === 'aborted') return;
        updateHint('Ses tanima basarisiz. Metin ile deneyin.');
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
  }, [clearRestartTimer, finishSession, onTranscript, restartListening, speech, updateHint]);

  const startListening = useCallback(async () => {
    if (disabled || isExpoGo || !speech) {
      updateHint('Mikrofon TestFlight / Play build gerektirir.');
      return;
    }
    if (!available) {
      updateHint('Bu cihazda ses tanima kullanilamiyor.');
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

    updateHint(null);
    userStoppedRef.current = false;
    lastTranscriptRef.current = '';
    try {
      const permission = await requestSpeechPermissions(speech);
      if (!permission.granted) {
        updateHint('Mikrofon ve konusma tanima izni gerekli.');
        return;
      }
      speech.start(buildGastroSpeechStartOptions());
    } catch {
      userStoppedRef.current = true;
      updateHint('Ses tanima baslatilamadi. Metin ile deneyin.');
      setListening(false);
    }
  }, [available, clearRestartTimer, disabled, finishSession, listening, speech, updateHint]);

  useEffect(() => {
    if (!autoStart || !active || disabled || isExpoGo || autoStartedRef.current || listening) return;
    if (!speech || !available) return;

    const timer = setTimeout(() => {
      if (autoStartedRef.current || listening) return;
      autoStartedRef.current = true;
      void startListening();
    }, AUTO_START_DELAY_MS);

    return () => clearTimeout(timer);
  }, [active, autoStart, available, disabled, listening, speech, startListening]);

  useEffect(() => {
    onUiStateChange?.({ listening, transcribing: false });
  }, [listening, onUiStateChange]);

  const showCompactHint = compact && !overlayCompact && listening;
  const showInlineHint = hint && !overlayCompact;

  return (
    <>
      <Pressable
        style={[
          styles.btn,
          compact && styles.btnCompact,
          overlayCompact && styles.btnOverlay,
          listening && styles.btnActive,
          overlayCompact && !listening && styles.btnOverlayIdle,
          (disabled || !available) && styles.btnDisabled,
        ]}
        onPress={() => void startListening()}
        disabled={disabled}
        hitSlop={overlayCompact ? 12 : undefined}
        accessibilityRole="button"
        accessibilityLabel="Sesli arama"
        accessibilityHint={
          listening ? 'Dinlemeyi bitirmek icin tekrar dokun' : 'Konusmak icin dokun'
        }>
        {listening ? (
          <ActivityIndicator color="#141414" size="small" />
        ) : overlayCompact ? null : (
          <Text style={styles.emoji}>🎙️</Text>
        )}
        {!compact ? (
          <Text style={styles.label}>
            {listening ? 'Dinleniyor… (bitir: tekrar dokun)' : 'Konus'}
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
