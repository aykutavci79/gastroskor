import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { EglenceResultModal } from '@/components/eglence/EglenceResultModal';
import { MiniSudokuGrid } from '@/components/mini-sudoku/MiniSudokuGrid';
import { MiniSudokuPad } from '@/components/mini-sudoku/MiniSudokuPad';
import { MiniSudokuToolbar } from '@/components/mini-sudoku/MiniSudokuToolbar';
import { MINI_SUDOKU_THEME } from '@/constants/mini-sudoku-theme';
import { SudokuScreen } from '@/components/mini-sudoku/SudokuScreen';
import { EGLENCE_GUNLUK_TEK_OYUN } from '@/constants/eglence-games';
import { eglenceZorlukEtiket, parseEglenceZorluk } from '@/constants/eglence-zorluk';
import { useSession } from '@/context/session-context';
import { notifyFriendsEglenceActivity } from '@/lib/eglence-friend-activity';
import { playHubSfx } from '@/lib/gastro-hub-sfx';
import { EGLENCE_LOBBY_ROUTES } from '@/lib/eglence-lobby-routes';
import { scoreMiniSudoku } from '@/lib/eglence-scoring';
import type { Digit } from '@/lib/mini-sudoku/constants';
import { SUDOKU_AUTO_COMPLETE_THRESHOLD, SUDOKU_UNDO_LIMIT, SIZE } from '@/lib/mini-sudoku/constants';
import {
  autoCompleteFromSolution,
  cloneGrid,
  countEmptyCells,
  eliminateNotesForDigit,
  filledCellsMatchSolution,
  isGiven,
  isSolved,
  isWrongPlacement,
  remainingDigitCounts,
  toggleNote,
} from '@/lib/mini-sudoku/engine';
import { getDailyPuzzle, isSudokuZorluk } from '@/lib/mini-sudoku/puzzle-cache';
import { activePuzzleId } from '@/lib/mini-sudoku/schedule';
import { loadProgress, resetSudokuSession, saveProgress, saveSudokuDailyRecord } from '@/lib/mini-sudoku/storage';
import type { MiniSudokuProgress, MiniSudokuPuzzle, SudokuSnapshot } from '@/lib/mini-sudoku/types';

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function snapshotProgress(progress: MiniSudokuProgress): SudokuSnapshot {
  return {
    values: cloneGrid(progress.values),
    notes: progress.notes.map((row) => row.map((cell) => [...cell])),
  };
}

function applySnapshot(progress: MiniSudokuProgress, snap: SudokuSnapshot): MiniSudokuProgress {
  return {
    ...progress,
    values: snap.values,
    notes: snap.notes,
  };
}

export default function MiniSudokuOyunScreen() {
  const t = MINI_SUDOKU_THEME;
  const { t: tr } = useTranslation();
  const router = useRouter();
  const { user } = useSession();
  const { zorluk: zorlukParam, oturum: oturumParam } = useLocalSearchParams<{
    zorluk?: string;
    oturum?: string;
  }>();
  const zorlukRaw = parseEglenceZorluk(zorlukParam);
  const zorluk = isSudokuZorluk(zorlukRaw) ? zorlukRaw : 'orta';
  const oturumYeni = oturumParam === 'yeni';

  const [puzzle, setPuzzle] = useState<MiniSudokuPuzzle | null>(null);
  const [progress, setProgress] = useState<MiniSudokuProgress | null>(null);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [focusDigit, setFocusDigit] = useState<Digit | null>(null);
  const [noteMode, setNoteMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resultScore, setResultScore] = useState<{ score: number; detail: string } | null>(null);
  const resultShownRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const undoStackRef = useRef<SudokuSnapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: { padding: 16, paddingBottom: 32, alignItems: 'stretch' },
        topRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        },
        livesWrap: { flex: 1, alignItems: 'center' },
        livesText: { fontSize: 18, fontWeight: '800', color: t.bad },
        meta: { color: t.muted, fontSize: 13, minWidth: 72 },
        timer: { color: t.timer, fontWeight: '700', fontSize: 15, minWidth: 72, textAlign: 'right' },
        gameOverBanner: {
          marginTop: 12,
          padding: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: t.bad,
          backgroundColor: 'rgba(255, 92, 92, 0.12)',
          gap: 4,
        },
        gameOverTitle: { color: t.bad, fontWeight: '800', fontSize: 15 },
        gameOverBody: { color: t.muted, fontSize: 13, lineHeight: 18 },
        autoCompleteBtn: {
          marginTop: 12,
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 16,
          alignItems: 'center',
          backgroundColor: t.accentSoft,
          borderWidth: 1,
          borderColor: t.borderStrong,
        },
        autoCompleteText: { color: t.accent, fontSize: 15, fontWeight: '800' },
        autoCompleteSub: { color: t.muted, fontSize: 12, marginTop: 4 },
      }),
    [t],
  );

  const completed = EGLENCE_GUNLUK_TEK_OYUN && progress?.completedAt != null;
  const locked = completed || progress?.gameOver === true;

  const digitCounts = useMemo(() => {
    if (!puzzle || !progress) return null;
    return remainingDigitCounts(puzzle.solution, progress.values);
  }, [progress, puzzle]);

  const highlightDigit = focusDigit;

  const emptyCells = useMemo(() => {
    if (!progress) return SIZE * SIZE;
    return countEmptyCells(progress.values);
  }, [progress]);

  const canAutoComplete = useMemo(() => {
    if (!puzzle || !progress || locked) return false;
    if (emptyCells === 0 || emptyCells > SUDOKU_AUTO_COMPLETE_THRESHOLD) return false;
    return filledCellsMatchSolution(progress.values, puzzle.solution);
  }, [emptyCells, locked, progress, puzzle]);

  const pushUndo = useCallback((before: MiniSudokuProgress) => {
    undoStackRef.current = [...undoStackRef.current.slice(-(SUDOKU_UNDO_LIMIT - 1)), snapshotProgress(before)];
    setCanUndo(undoStackRef.current.length > 0);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setProgress((prev) =>
        prev && !prev.completedAt && !prev.gameOver ? { ...prev, elapsedMs: prev.elapsedMs + 1000 } : prev,
      );
    }, 1000);
  }, [stopTimer]);

  const markComplete = useCallback(
    (next: MiniSudokuProgress) => {
      if (!puzzle || next.completedAt) return next;
      const scoreResult = scoreMiniSudoku({
        elapsedMs: next.elapsedMs,
        livesRemaining: next.lives,
        hintsRemaining: next.hintsRemaining,
      });
      const done: MiniSudokuProgress = { ...next, completedAt: new Date().toISOString() };
      void saveSudokuDailyRecord({
        puzzleId: puzzle.id,
        completedAt: done.completedAt!,
        elapsedMs: done.elapsedMs,
        score: scoreResult.score,
      });
      notifyFriendsEglenceActivity(user?.email, {
        game: 'mini_sudoku',
        elapsedMs: done.elapsedMs,
        score: scoreResult.score,
        puzzleId: puzzle.id,
      });
      if (!resultShownRef.current) {
        resultShownRef.current = true;
        setResultScore(scoreResult);
        setResultModalOpen(true);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      return done;
    },
    [puzzle, user?.email],
  );

  const handleResultDone = useCallback(() => {
    if (!puzzle) return;
    void resetSudokuSession(puzzle).then(() => {
      setResultModalOpen(false);
      setResultScore(null);
      resultShownRef.current = false;
      router.replace(EGLENCE_LOBBY_ROUTES['mini-sudoku'] as Href);
    });
  }, [puzzle, router]);

  const applyProgress = useCallback(
    (before: MiniSudokuProgress, next: MiniSudokuProgress, recordUndo = true) => {
      if (recordUndo) pushUndo(before);
      let resolved = next;
      if (isSolved(next.values, puzzle!.solution) && !next.completedAt) {
        resolved = markComplete(next);
      }
      setProgress(resolved);
    },
    [markComplete, pushUndo, puzzle],
  );

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      undoStackRef.current = [];
      setCanUndo(false);
      const daily = getDailyPuzzle(activePuzzleId(), zorluk);
      let saved = await loadProgress(daily);
      if (oturumYeni || (!EGLENCE_GUNLUK_TEK_OYUN && saved.completedAt)) {
        saved = await resetSudokuSession(daily);
      }
      if (!alive) return;
      setPuzzle(daily);
      setProgress(saved);
      setLoading(false);
      if (!saved.completedAt && !saved.gameOver) startTimer();
      else if (!oturumYeni && EGLENCE_GUNLUK_TEK_OYUN && saved.completedAt) {
        const scoreResult = scoreMiniSudoku({
          elapsedMs: saved.elapsedMs,
          livesRemaining: saved.lives,
          hintsRemaining: saved.hintsRemaining,
        });
        setResultScore(scoreResult);
        setResultModalOpen(true);
      }
    })();
    return () => {
      alive = false;
      stopTimer();
    };
  }, [oturumYeni, startTimer, stopTimer, zorluk]);

  useEffect(() => {
    if (!progress) return;
    void saveProgress(progress);
  }, [progress]);

  useEffect(() => {
    if (progress?.completedAt || progress?.gameOver) stopTimer();
  }, [progress?.completedAt, progress?.gameOver, stopTimer]);

  const onSelect = useCallback(
    (row: number, col: number) => {
      setSelected({ row, col });
      if (progress) {
        const value = progress.values[row]![col]!;
        setFocusDigit(value > 0 ? (value as Digit) : null);
      }
    },
    [progress],
  );

  const loseLife = useCallback((base: MiniSudokuProgress): MiniSudokuProgress => {
    const lives = Math.max(0, base.lives - 1);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    if (lives <= 0) {
      return { ...base, lives: 0, gameOver: true };
    }
    return { ...base, lives };
  }, []);

  const onPick = useCallback(
    (digit: Digit) => {
      if (!puzzle || !progress || locked) return;
      if (selected == null) return;
      const { row, col } = selected;
      if (isGiven(puzzle.givens, row, col)) return;

      if (noteMode) {
        const before = progress;
        const notes = toggleNote(progress.notes, row, col, digit);
        setFocusDigit(digit);
        applyProgress(before, { ...progress, notes });
        return;
      }

      setFocusDigit(digit);

      const before = progress;
      const values = cloneGrid(progress.values);
      values[row]![col] = digit;
      const notes = eliminateNotesForDigit(progress.notes, row, col, digit);

      let next: MiniSudokuProgress = { ...progress, values, notes };
      if (isWrongPlacement(puzzle.solution, row, col, digit)) {
        playHubSfx('buzzer');
        next = loseLife(next);
      }
      applyProgress(before, next);
    },
    [applyProgress, locked, loseLife, noteMode, progress, puzzle, selected],
  );

  const onErase = useCallback(() => {
    if (!puzzle || !progress || locked || selected == null) return;
    const { row, col } = selected;
    if (isGiven(puzzle.givens, row, col)) return;
    const before = progress;
    const values = cloneGrid(progress.values);
    values[row]![col] = 0;
    const notes = progress.notes.map((r, ri) =>
      r.map((cell, ci) => (ri === row && ci === col ? [] : [...cell])),
    );
    applyProgress(before, { ...progress, values, notes });
  }, [applyProgress, locked, progress, puzzle, selected]);

  const onUndo = useCallback(() => {
    if (locked || !progress) return;
    const snap = undoStackRef.current.pop();
    if (!snap) return;
    setProgress(applySnapshot(progress, snap));
    setCanUndo(undoStackRef.current.length > 0);
  }, [locked, progress]);

  const onHint = useCallback(() => {
    if (!puzzle || !progress || locked) return;
    if (progress.hintsRemaining <= 0) return;
    if (selected == null) {
      Alert.alert(tr('eglence.miniSudoku.ipucuAlertTitle'), tr('eglence.miniSudoku.ipucuAlertBody'));
      return;
    }
    const { row, col } = selected;
    if (isGiven(puzzle.givens, row, col)) return;
    if (progress.values[row]![col]! > 0) return;

    const before = progress;
    const values = cloneGrid(progress.values);
    const hintDigit = puzzle.solution[row]![col]! as Digit;
    values[row]![col] = hintDigit;
    const notes = eliminateNotesForDigit(progress.notes, row, col, hintDigit);
    const next: MiniSudokuProgress = {
      ...progress,
      values,
      notes,
      hintsRemaining: progress.hintsRemaining - 1,
    };
    applyProgress(before, next);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [applyProgress, locked, progress, puzzle, selected]);

  const onAutoComplete = useCallback(() => {
    if (!puzzle || !progress || !canAutoComplete) return;
    const before = progress;
    const { values, notes } = autoCompleteFromSolution(progress.values, progress.notes, puzzle.solution);
    applyProgress(before, { ...progress, values, notes }, true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [applyProgress, canAutoComplete, progress, puzzle]);

  if (loading || !puzzle || !progress) {
    return (
      <SudokuScreen scroll={false} edges={['bottom', 'left', 'right']}>
        <ActivityIndicator color={t.accent} style={{ marginTop: 48 }} />
      </SudokuScreen>
    );
  }

  return (
    <SudokuScreen scroll edges={['bottom', 'left', 'right']}>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.meta}>{tr('eglence.miniSudoku.metaLabel', { zorluk: eglenceZorlukEtiket(zorluk) })}</Text>
          <View style={styles.livesWrap}>
            <Text style={styles.livesText}>{progress.lives} ❤️</Text>
          </View>
          <Text style={styles.timer}>{formatElapsed(progress.elapsedMs)}</Text>
        </View>

        <MiniSudokuGrid
          givens={puzzle.givens}
          values={progress.values}
          notes={progress.notes}
          selected={selected}
          focusDigit={focusDigit}
          onSelect={onSelect}
        />

        {canAutoComplete ? (
          <Pressable
            style={({ pressed }) => [styles.autoCompleteBtn, pressed && { opacity: 0.88 }]}
            onPress={onAutoComplete}
            accessibilityRole="button"
            accessibilityLabel={tr('eglence.miniSudoku.otomatikTamamla')}>
            <Text style={styles.autoCompleteText}>{tr('eglence.miniSudoku.otomatikTamamla')}</Text>
            <Text style={styles.autoCompleteSub}>
              {tr('eglence.miniSudoku.otomatikTamamlaSub', { n: emptyCells })}
            </Text>
          </Pressable>
        ) : null}

        <MiniSudokuToolbar
          noteMode={noteMode}
          hintsRemaining={progress.hintsRemaining}
          canUndo={canUndo}
          disabled={locked}
          onUndo={onUndo}
          onErase={onErase}
          onToggleNotes={() => setNoteMode((v) => !v)}
          onHint={() => void onHint()}
        />

        {digitCounts ? (
          <MiniSudokuPad
            remaining={digitCounts}
            onPick={onPick}
            disabled={locked}
            highlightDigit={highlightDigit && highlightDigit > 0 ? highlightDigit : null}
          />
        ) : null}

        {progress.gameOver ? (
          <View style={styles.gameOverBanner}>
            <Text style={styles.gameOverTitle}>{tr('eglence.miniSudoku.canlarBitti')}</Text>
            <Text style={styles.gameOverBody}>
              {tr('eglence.miniSudoku.canlarBittiBody')}
            </Text>
          </View>
        ) : null}
      </View>

      <EglenceResultModal
        visible={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        onDone={handleResultDone}
        game="mini_sudoku"
        periodKey={puzzle.id}
        elapsedMs={progress.elapsedMs}
        score={resultScore?.score}
        scoreDetail={resultScore?.detail}
      />
    </SudokuScreen>
  );
}
