import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { EglenceResultModal } from '@/components/eglence/EglenceResultModal';
import { KelimeSofrasiGrid } from '@/components/kelime-sofrasi/KelimeSofrasiGrid';
import { KelimeSofrasiWheel } from '@/components/kelime-sofrasi/KelimeSofrasiWheel';
import { Screen } from '@/components/ui/Screen';
import { SOFRA_MIN_KELIME_UZUNLUGU } from '@/constants/kelime-sofrasi';
import { useGastroTheme } from '@/context/theme-context';
import { useSession } from '@/context/session-context';
import { notifyFriendsEglenceActivity } from '@/lib/eglence-friend-activity';
import {
  bulmacaTamamlandi,
  carkKaristir,
  hedefKelimeMi,
  kelimeCarktanOlusur,
} from '@/lib/kelime-sofrasi/engine';
import { buildDailySofraPuzzle, todaySofraPuzzleId } from '@/lib/kelime-sofrasi/puzzle';
import { loadSofraProgress, saveSofraProgress } from '@/lib/kelime-sofrasi/storage';
import type { SofraProgress, SofraPuzzle } from '@/lib/kelime-sofrasi/types';
import { formatNextResetHint } from '@/lib/mini-sudoku/schedule';
import { mulberry32, seedFromString } from '@/lib/mini-sudoku/rng';

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function KelimeSofrasiOyunScreen() {
  const { colors } = useGastroTheme();
  const { user } = useSession();
  const router = useRouter();
  const [puzzle, setPuzzle] = useState<SofraPuzzle | null>(null);
  const [progress, setProgress] = useState<SofraProgress | null>(null);
  const [selectedPath, setSelectedPath] = useState<number[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resultOpen, setResultOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifiedRef = useRef(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: { padding: 16, paddingBottom: 32, gap: 12 },
        metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        meta: { color: colors.muted, fontSize: 13 },
        timer: { color: colors.gold, fontWeight: '700', fontSize: 15 },
        progress: { color: colors.text, fontSize: 13, fontWeight: '700' },
        message: {
          textAlign: 'center',
          color: colors.accent,
          fontSize: 14,
          fontWeight: '600',
          minHeight: 20,
        },
        submit: {
          backgroundColor: colors.accent,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
          opacity: 1,
        },
        submitDisabled: { opacity: 0.45 },
        submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
        doneCard: {
          marginTop: 8,
          padding: 16,
          borderRadius: 14,
          backgroundColor: colors.accentSoft,
          borderWidth: 1,
          borderColor: colors.accent,
          gap: 6,
        },
        doneTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
        doneSub: { color: colors.muted, lineHeight: 20 },
        backBtn: {
          marginTop: 8,
          alignSelf: 'center',
          paddingVertical: 10,
          paddingHorizontal: 16,
        },
        backText: { color: colors.muted, fontWeight: '600' },
      }),
    [colors],
  );

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setProgress((prev) => (prev && !prev.completedAt ? { ...prev, elapsedMs: prev.elapsedMs + 1000 } : prev));
    }, 1000);
  }, [stopTimer]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      const daily = buildDailySofraPuzzle(todaySofraPuzzleId());
      const saved = await loadSofraProgress(daily);
      if (!alive) return;
      setPuzzle(daily);
      setProgress(saved);
      setLoading(false);
      if (!saved.completedAt) startTimer();
      if (saved.completedAt) setResultOpen(true);
    })();
    return () => {
      alive = false;
      stopTimer();
    };
  }, [startTimer, stopTimer]);

  useEffect(() => {
    if (!progress) return;
    void saveSofraProgress(progress);
  }, [progress]);

  const completed = progress?.completedAt != null;

  const trySubmit = useCallback(() => {
    if (!puzzle || !progress || completed || selectedPath.length < SOFRA_MIN_KELIME_UZUNLUGU) return;
    const word = selectedPath.map((i) => puzzle.wheel[i]).join('');
    if (!kelimeCarktanOlusur(word, puzzle.wheel, selectedPath)) {
      setMessage('Harfleri sırayla seç');
      return;
    }
    const target = hedefKelimeMi(puzzle, word);
    if (!target) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setMessage('Bu kelime sofrada yok');
      setSelectedPath([]);
      return;
    }
    if (progress.foundWordIds.includes(target.id)) {
      setMessage('Zaten bulundu');
      setSelectedPath([]);
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const foundWordIds = [...progress.foundWordIds, target.id];
    const done = bulmacaTamamlandi(puzzle, foundWordIds);
    setProgress({
      ...progress,
      foundWordIds,
      completedAt: done ? new Date().toISOString() : null,
    });
    setSelectedPath([]);
    setMessage(done ? 'Sofra tamam!' : `+ ${target.kelime}`);
    if (done) {
      stopTimer();
      setResultOpen(true);
      if (!notifiedRef.current && user) {
        notifiedRef.current = true;
        void notifyFriendsEglenceActivity(user?.email, {
          game: 'kelime_sofrasi',
          puzzleId: puzzle.id,
          elapsedMs: progress.elapsedMs,
        });
      }
    }
  }, [completed, puzzle, progress, selectedPath, stopTimer, user]);

  const onLetterPress = useCallback(
    (wheelIndex: number) => {
      if (completed) return;
      setMessage(null);
      setSelectedPath((prev) => {
        if (prev.includes(wheelIndex)) {
          if (prev[prev.length - 1] === wheelIndex) {
            return prev.slice(0, -1);
          }
          return prev;
        }
        return [...prev, wheelIndex];
      });
    },
    [completed],
  );

  const onShuffle = useCallback(() => {
    if (!puzzle || !progress || completed) return;
    const rand = mulberry32(seedFromString(`${puzzle.id}:shuffle:${Date.now()}`));
    setProgress({
      ...progress,
      wheelOrder: carkKaristir(puzzle.wheel, progress.wheelOrder, rand),
    });
    setSelectedPath([]);
    setMessage(null);
  }, [completed, puzzle, progress]);

  if (loading || !puzzle || !progress) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const foundCount = progress.foundWordIds.length;
  const totalCount = puzzle.words.length;
  const canSubmit = selectedPath.length >= SOFRA_MIN_KELIME_UZUNLUGU && !completed;

  return (
    <Screen>
      <View style={styles.content}>
        <View style={styles.metaRow}>
          <Text style={styles.progress}>
            {foundCount}/{totalCount} kelime
          </Text>
          <Text style={styles.timer}>{formatElapsed(progress.elapsedMs)}</Text>
        </View>
        <Text style={styles.meta}>{formatNextResetHint()}</Text>

        <KelimeSofrasiGrid grid={puzzle.grid} foundWordIds={progress.foundWordIds} />
        <Text style={styles.message}>{message ?? ' '}</Text>

        <KelimeSofrasiWheel
          wheel={puzzle.wheel}
          order={progress.wheelOrder}
          selectedPath={selectedPath}
          onLetterPress={onLetterPress}
          onClear={() => setSelectedPath([])}
          onShuffle={onShuffle}
          disabled={completed}
        />

        <Pressable
          style={[styles.submit, !canSubmit && styles.submitDisabled]}
          disabled={!canSubmit}
          onPress={trySubmit}>
          <Text style={styles.submitText}>Kelimeyi Onayla</Text>
        </Pressable>

        {completed ? (
          <View style={styles.doneCard}>
            <Text style={styles.doneTitle}>Sofra tamamlandı</Text>
            <Text style={styles.doneSub}>Süre: {formatElapsed(progress.elapsedMs)} · {formatNextResetHint()}</Text>
            <Pressable style={styles.backBtn} onPress={() => router.replace('/(tabs)/eglence')}>
              <Text style={styles.backText}>Eğlenceye dön</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <EglenceResultModal
        visible={resultOpen}
        onClose={() => setResultOpen(false)}
        game="kelime_sofrasi"
        periodKey={puzzle.id}
        elapsedMs={progress.elapsedMs}
      />
    </Screen>
  );
}
