import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { GunlukKelimeBoard } from '@/components/gunluk-kelime/GunlukKelimeBoard';
import { GunlukKelimeKeyboard } from '@/components/gunluk-kelime/GunlukKelimeKeyboard';
import { GUNLUK_KELIME_LENGTH, GUNLUK_KELIME_MAX_GUESSES } from '@/constants/gunluk-kelime';
import { EGLENCE_GUNLUK_TEK_OYUN } from '@/constants/eglence-games';
import { eglenceLobbyTheme } from '@/constants/eglence-card-art-theme';
import {
  gunlukKelimeShareEmoji,
  mergeKeyboardStates,
  tryScoreGunlukKelimeGuess,
  type LetterState,
} from '@/lib/gunluk-kelime/engine';
import { loadGunlukKelimeProgress, saveGunlukKelimeProgress } from '@/lib/gunluk-kelime/storage';
import type { GunlukKelimeProgress } from '@/lib/gunluk-kelime/types';
import { gunlukKelimeKanonik } from '@/lib/gunluk-kelime/words';
import {
  gunlukKelimeAppendHarf,
  gunlukKelimeBackspace,
  gunlukKelimeGraphemes,
  gunlukKelimeHarfSayisi,
} from '@/lib/gunluk-kelime/grapheme';
import { activePuzzleId } from '@/lib/mini-sudoku/schedule';

function safeHaptic(fn: () => Promise<unknown>): void {
  void fn().catch(() => undefined);
}

export default function GunlukKelimeOyunScreen() {
  const t = eglenceLobbyTheme('gunluk-kelime');
  const puzzleId = activePuzzleId();

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<GunlukKelimeProgress | null>(null);
  const [current, setCurrent] = useState('');
  const [keyboard, setKeyboard] = useState<Record<string, LetterState>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'warn' | 'bad' | null>(null);
  const [shakeRow, setShakeRow] = useState<number | undefined>();

  const showMessage = useCallback((text: string, tone: 'warn' | 'bad') => {
    setMessage(text);
    setMessageTone(tone);
  }, []);

  const clearMessage = useCallback(() => {
    setMessage(null);
    setMessageTone(null);
  }, []);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const locked = useMemo(() => {
    if (!progress) return true;
    if (EGLENCE_GUNLUK_TEK_OYUN && progress.completedAt) return true;
    return progress.guesses.length >= GUNLUK_KELIME_MAX_GUESSES || progress.won;
  }, [progress]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        screen: { flex: 1, backgroundColor: t.bg },
        content: { flexGrow: 1, padding: 16, paddingBottom: 24, gap: 16, alignItems: 'center' },
        meta: { color: t.muted, fontSize: 13, textAlign: 'center' },
        legend: { color: t.muted, fontSize: 11, textAlign: 'center', lineHeight: 16 },
        message: {
          color: '#fff',
          fontSize: 14,
          fontWeight: '700',
          textAlign: 'center',
          minHeight: 20,
        },
        messageBad: { color: '#FF6B6B' },
        messageWarn: { color: '#E8B84A' },
        resultBox: {
          width: '100%',
          borderRadius: 12,
          padding: 16,
          gap: 8,
          backgroundColor: t.panel,
          borderWidth: 1,
          borderColor: t.border,
        },
        resultTitle: { color: t.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
        resultBody: { color: t.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
        answer: { color: t.accent, fontWeight: '800' },
        shareBtn: {
          marginTop: 4,
          borderRadius: 10,
          paddingVertical: 12,
          alignItems: 'center',
          backgroundColor: t.accentSoft,
          borderWidth: 1,
          borderColor: t.borderStrong,
        },
        shareText: { color: t.accent, fontWeight: '800', fontSize: 15 },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
      }),
    [t],
  );

  useEffect(() => {
    let alive = true;
    void loadGunlukKelimeProgress(puzzleId)
      .then((p) => {
        if (!alive) return;
        setProgress(p);
        let kb: Record<string, LetterState> = {};
        for (const g of p.guesses) {
          kb = mergeKeyboardStates(kb, g.word, g.states);
        }
        setKeyboard(kb);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setMessage('Oyun yüklenemedi — lobiden tekrar dene');
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [puzzleId]);

  const triggerShake = useCallback(() => {
    if (!progress) return;
    setShakeRow(progress.guesses.length);
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    shakeTimer.current = setTimeout(() => setShakeRow(undefined), 400);
  }, [progress]);

  const persist = useCallback(async (next: GunlukKelimeProgress) => {
    setProgress(next);
    await saveGunlukKelimeProgress(next);
  }, []);

  const rejectGuess = useCallback(() => {
    safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
    triggerShake();
  }, [triggerShake]);

  const submitGuess = useCallback(async () => {
    if (!progress || locked) return;

    const harfSayisi = gunlukKelimeHarfSayisi(current);
    if (harfSayisi !== GUNLUK_KELIME_LENGTH) {
      showMessage('5 harf gir', 'warn');
      rejectGuess();
      return;
    }

    const canonical = gunlukKelimeKanonik(word);
    if (!canonical) {
      showMessage('Sözlükte yok — geçerli 5 harfli kelime dene', 'warn');
      rejectGuess();
      return;
    }

    try {
      const answerChars = gunlukKelimeGraphemes(progress.answer);
      if (answerChars.length !== GUNLUK_KELIME_LENGTH) {
        showMessage('Günlük kelime yüklenemedi — lobiden tekrar gir', 'bad');
        return;
      }
      const answer = answerChars.join('');

      clearMessage();
      const states = tryScoreGunlukKelimeGuess(answer, canonical);
      if (!states) {
        showMessage('Sözlükte yok — geçerli 5 harfli kelime dene', 'warn');
        rejectGuess();
        return;
      }
      const won = states.every((s) => s === 'correct');
      const guesses = [...progress.guesses, { word: canonical, states }];
      const done = won || guesses.length >= GUNLUK_KELIME_MAX_GUESSES;

      setKeyboard((kb) => mergeKeyboardStates(kb, canonical, states));
      setCurrent('');

      const next: GunlukKelimeProgress = {
        ...progress,
        answer,
        guesses,
        won: won || progress.won,
        completedAt: done ? new Date().toISOString() : null,
      };

      await persist(next);

      if (won) {
        safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
      } else if (done) {
        safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
      } else {
        safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
      }
    } catch (err) {
      if (__DEV__) console.warn('gunluk-kelime submit', err);
      showMessage('Tahmin işlenemedi — tekrar dene', 'bad');
      rejectGuess();
    }
  }, [clearMessage, current, locked, persist, progress, rejectGuess, showMessage]);

  const onKey = useCallback(
    (key: string) => {
      if (!progress || locked) return;
      if (key === 'BACK') {
        setCurrent((c) => gunlukKelimeBackspace(c));
        clearMessage();
        return;
      }
      if (key === 'ENTER') {
        void submitGuess().catch(() => {
          showMessage('Tahmin işlenemedi — tekrar dene', 'bad');
        });
        return;
      }
      setCurrent((c) => gunlukKelimeAppendHarf(c, key));
      clearMessage();
    },
    [clearMessage, locked, progress, showMessage, submitGuess],
  );

  const shareResult = useCallback(async () => {
    if (!progress) return;
    const grid = gunlukKelimeShareEmoji(progress.guesses);
    const line = progress.won
      ? `${progress.guesses.length}/${GUNLUK_KELIME_MAX_GUESSES}`
      : `X/${GUNLUK_KELIME_MAX_GUESSES}`;
    const body = `GastroSkor Günlük Kelime ${puzzleId}\n${line}\n\n${grid}`;
    try {
      await Share.share({ message: body });
    } catch {
      Alert.alert('Paylaş', 'Paylaşım iptal edildi.');
    }
  }, [progress, puzzleId]);

  if (loading || !progress) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={t.accent} size="large" />
      </View>
    );
  }

  const showResult = progress.completedAt != null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.meta}>
        {progress.guesses.length}/{GUNLUK_KELIME_MAX_GUESSES} · {puzzleId}
      </Text>
      <Text style={styles.legend}>🟩 Harf doğru kutu · 🟨 Harf var, başka yerde · ⬛ Yok</Text>

      <GunlukKelimeBoard guesses={progress.guesses} current={current} shakeRow={shakeRow} />

      <Text
        style={[
          styles.message,
          messageTone === 'bad' ? styles.messageBad : null,
          messageTone === 'warn' ? styles.messageWarn : null,
        ]}>
        {message ?? ' '}
      </Text>

      <GunlukKelimeKeyboard letterStates={keyboard} disabled={locked} onKey={onKey} />

      {showResult ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>
            {progress.won ? 'Tebrikler!' : 'Yarın tekrar dene'}
          </Text>
          <Text style={styles.resultBody}>
            {progress.won
              ? `Kelimeyi ${progress.guesses.length}. denemede buldun.`
              : (
                  <>
                    Cevap: <Text style={styles.answer}>{progress.answer}</Text>
                  </>
                )}
          </Text>
          <Pressable style={styles.shareBtn} onPress={() => void shareResult()}>
            <Text style={styles.shareText}>Sonucu paylaş</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}
