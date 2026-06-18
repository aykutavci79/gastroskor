import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { EglenceResultModal } from '@/components/eglence/EglenceResultModal';
import { MiniSudokuGrid } from '@/components/mini-sudoku/MiniSudokuGrid';
import { MiniSudokuPad } from '@/components/mini-sudoku/MiniSudokuPad';
import { Screen } from '@/components/ui/Screen';
import { EGLENCE_GUNLUK_TEK_OYUN } from '@/constants/eglence-games';
import { parseEglenceZorluk } from '@/constants/eglence-zorluk';
import { useGastroTheme } from '@/context/theme-context';
import { useSession } from '@/context/session-context';
import { notifyFriendsEglenceActivity } from '@/lib/eglence-friend-activity';
import type { Digit } from '@/lib/mini-sudoku/constants';
import { cloneGrid, isGiven, isSolved, toggleNote } from '@/lib/mini-sudoku/engine';
import { getDailyPuzzle, isSudokuZorluk } from '@/lib/mini-sudoku/puzzle-cache';
import { activePuzzleId } from '@/lib/mini-sudoku/schedule';
import { loadProgress, saveProgress } from '@/lib/mini-sudoku/storage';
import type { MiniSudokuProgress, MiniSudokuPuzzle } from '@/lib/mini-sudoku/types';

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function MiniSudokuOyunScreen() {
  const { colors } = useGastroTheme();
  const { user } = useSession();
  const { zorluk: zorlukParam } = useLocalSearchParams<{ zorluk?: string }>();
  const zorlukRaw = parseEglenceZorluk(zorlukParam);
  const zorluk = isSudokuZorluk(zorlukRaw) ? zorlukRaw : 'orta';

  const [puzzle, setPuzzle] = useState<MiniSudokuPuzzle | null>(null);
  const [progress, setProgress] = useState<MiniSudokuProgress | null>(null);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [noteMode, setNoteMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const resultShownRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: { padding: 16, paddingBottom: 32, alignItems: 'stretch' },
        metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
        meta: { color: colors.muted, fontSize: 13 },
        timer: { color: colors.gold, fontWeight: '700', fontSize: 15 },
        toolbar: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 16 },
        toolBtn: {
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.panel,
        },
        toolBtnOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
        toolText: { color: colors.muted, fontWeight: '600', fontSize: 13 },
        toolTextOn: { color: colors.accent },
      }),
    [colors],
  );

  const completed = EGLENCE_GUNLUK_TEK_OYUN && progress?.completedAt != null;

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
      const daily = getDailyPuzzle(activePuzzleId(), zorluk);
      const saved = await loadProgress(daily);
      if (!alive) return;
      setPuzzle(daily);
      setProgress(saved);
      setLoading(false);
      if (!saved.completedAt) startTimer();
      else if (EGLENCE_GUNLUK_TEK_OYUN) setResultModalOpen(true);
    })();
    return () => {
      alive = false;
      stopTimer();
    };
  }, [startTimer, stopTimer, zorluk]);

  useEffect(() => {
    if (!progress) return;
    void saveProgress(progress);
  }, [progress]);

  useEffect(() => {
    if (progress?.completedAt) stopTimer();
  }, [progress?.completedAt, stopTimer]);

  const onSelect = useCallback((row: number, col: number) => {
    setSelected({ row, col });
  }, []);

  const onPick = useCallback(
    (digit: Digit) => {
      if (!puzzle || !progress || completed) return;
      if (selected == null) return;
      const { row, col } = selected;
      if (isGiven(puzzle.givens, row, col)) return;

      if (noteMode) {
        const notes = toggleNote(progress.notes, row, col, digit);
        setProgress({ ...progress, notes });
        return;
      }

      const values = cloneGrid(progress.values);
      values[row]![col] = digit;
      const notes = progress.notes.map((r, ri) =>
        r.map((cell, ci) => (ri === row && ci === col ? [] : [...cell])),
      );
      const next: MiniSudokuProgress = { ...progress, values, notes };
      if (isSolved(values, puzzle.solution) && !progress.completedAt) {
        next.completedAt = new Date().toISOString();
        notifyFriendsEglenceActivity(user?.email, {
          game: 'mini_sudoku',
          elapsedMs: next.elapsedMs,
          puzzleId: puzzle.id,
        });
        if (!resultShownRef.current) {
          resultShownRef.current = true;
          setResultModalOpen(true);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
      setProgress(next);
    },
    [completed, noteMode, progress, puzzle, selected, user?.email],
  );

  const onErase = useCallback(() => {
    if (!puzzle || !progress || completed || selected == null) return;
    const { row, col } = selected;
    if (isGiven(puzzle.givens, row, col)) return;
    const values = cloneGrid(progress.values);
    values[row]![col] = 0;
    const notes = progress.notes.map((r, ri) =>
      r.map((cell, ci) => (ri === row && ci === col ? [] : [...cell])),
    );
    setProgress({ ...progress, values, notes });
  }, [completed, progress, puzzle, selected]);

  if (loading || !puzzle || !progress) {
    return (
      <Screen scroll={false} edges={['bottom', 'left', 'right']}>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 48 }} />
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <View style={styles.content}>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>6×6 · {zorluk === 'kolay' ? 'Kolay' : 'Orta'}</Text>
          <Text style={styles.timer}>{formatElapsed(progress.elapsedMs)}</Text>
        </View>

        <MiniSudokuGrid
          givens={puzzle.givens}
          values={progress.values}
          notes={progress.notes}
          selected={selected}
          onSelect={onSelect}
        />

        <View style={styles.toolbar}>
          <Pressable
            disabled={completed}
            onPress={() => setNoteMode((v) => !v)}
            style={[styles.toolBtn, noteMode && styles.toolBtnOn]}>
            <Text style={[styles.toolText, noteMode && styles.toolTextOn]}>Not</Text>
          </Pressable>
        </View>

        <MiniSudokuPad noteMode={noteMode} onPick={onPick} onErase={onErase} disabled={completed} />
      </View>

      <EglenceResultModal
        visible={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        game="mini_sudoku"
        periodKey={puzzle.id}
        elapsedMs={progress.elapsedMs}
      />
    </Screen>
  );
}
