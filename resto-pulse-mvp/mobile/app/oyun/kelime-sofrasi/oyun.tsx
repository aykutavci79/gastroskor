import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  InteractionManager,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EglenceResultModal } from '@/components/eglence/EglenceResultModal';
import { KelimeSofrasiGrid } from '@/components/kelime-sofrasi/KelimeSofrasiGrid';
import { KelimeSofrasiWheel } from '@/components/kelime-sofrasi/KelimeSofrasiWheel';
import { Screen } from '@/components/ui/Screen';
import { sofraBackgroundForPuzzle } from '@/constants/regional-flavor-images';
import { EGLENCE_GUNLUK_TEK_OYUN } from '@/constants/eglence-games';
import { parseEglenceZorluk } from '@/constants/eglence-zorluk';
import { SOFRA_MAX_IPUCU, SOFRA_FREE_IPUCU, SOFRA_MIN_KELIME_UZUNLUGU, SOFRA_LETTER_COLOR } from '@/constants/kelime-sofrasi';
import { spendGameHint } from '@/lib/api';
import { useGastroTheme } from '@/context/theme-context';
import { useSession } from '@/context/session-context';
import { notifyFriendsEglenceActivity } from '@/lib/eglence-friend-activity';
import {
  bonusKelimeMi,
  bulmacaTamamlandi,
  carkKaristir,
  hedefKelimeMi,
  hucreAnahtar,
  ipucuHakkiKaldi,
  kelimeCarktanOlusur,
  normalizeKelime,
  sonrakiIpucuHucresi,
} from '@/lib/kelime-sofrasi/engine';
import { getDailySofraPuzzle } from '@/lib/kelime-sofrasi/puzzle-cache';
import { activePuzzleId } from '@/lib/mini-sudoku/schedule';
import { loadSofraProgress, saveSofraProgress } from '@/lib/kelime-sofrasi/storage';
import type { SofraProgress, SofraPuzzle } from '@/lib/kelime-sofrasi/types';
import { formatNextResetHint } from '@/lib/mini-sudoku/schedule';
import { mulberry32, seedFromString } from '@/lib/mini-sudoku/rng';

const STACK_HEADER = 48;
const WHEEL_TOOLBAR_H = 38;
const WHEEL_PREVIEW_H = 34;
const META_BLOCK_H = 46;
const MESSAGE_H = 18;

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function useSofraLayout(puzzle: SofraPuzzle | null) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    if (!puzzle) {
      return { cellSize: 28, wheelDiameter: 200, compact: true };
    }

    const usableW = width - 24;
    const usableH = height - insets.top - insets.bottom - STACK_HEADER;

    const chromeH = META_BLOCK_H + MESSAGE_H + 12;
    const wheelChromeH = WHEEL_PREVIEW_H + WHEEL_TOOLBAR_H + 6;
    const playH = Math.max(320, usableH - chromeH);

    // Önce ızgaraya alan ayır — kutular öncelikli
    const gridBudget = Math.floor(playH * 0.58);
    const cellGap = 2;
    const cellFromHeight = Math.floor((gridBudget - 4) / puzzle.rows) - cellGap;
    const cellFromWidth = Math.floor((usableW - puzzle.cols * cellGap) / puzzle.cols);
    let cellSize = Math.min(cellFromWidth, cellFromHeight, 48);
    cellSize = Math.max(26, cellSize);

    const gridH = puzzle.rows * (cellSize + cellGap) + 4;
    let wheelDiameter = Math.min(usableW * 0.48, playH - gridH - wheelChromeH - 4);
    wheelDiameter = Math.max(128, Math.floor(wheelDiameter));

    if (gridH + wheelDiameter + wheelChromeH > playH) {
      wheelDiameter = Math.max(132, playH - gridH - wheelChromeH - 2);
    }
    if (gridH + wheelDiameter + wheelChromeH > playH) {
      const tightGrid = playH - wheelDiameter - wheelChromeH - 2;
      cellSize = Math.max(22, Math.floor(tightGrid / puzzle.rows) - cellGap);
    }

    return { cellSize, wheelDiameter, compact: true };
  }, [height, insets.bottom, insets.top, puzzle, width]);
}

export default function KelimeSofrasiOyunScreen() {
  const { colors } = useGastroTheme();
  const { user } = useSession();
  const router = useRouter();
  const { zorluk: zorlukParam } = useLocalSearchParams<{ zorluk?: string }>();
  const zorluk = parseEglenceZorluk(zorlukParam);
  const [puzzle, setPuzzle] = useState<SofraPuzzle | null>(null);
  const [progress, setProgress] = useState<SofraProgress | null>(null);
  const [selectedPath, setSelectedPath] = useState<number[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resultOpen, setResultOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifiedRef = useRef(false);
  const layout = useSofraLayout(puzzle);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1 },
        bgImage: { ...StyleSheet.absoluteFillObject, opacity: 1 },
        content: {
          flex: 1,
          paddingHorizontal: 12,
          paddingTop: 2,
          paddingBottom: 6,
        },
        topBlock: { height: META_BLOCK_H, justifyContent: 'center', gap: 1 },
        metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        meta: { color: SOFRA_LETTER_COLOR, fontSize: 11, fontWeight: '700' },
        timer: { color: SOFRA_LETTER_COLOR, fontWeight: '800', fontSize: 14 },
        progress: { color: SOFRA_LETTER_COLOR, fontSize: 13, fontWeight: '800' },
        bonusMeta: { color: SOFRA_LETTER_COLOR, fontSize: 11, fontWeight: '700' },
        playArea: { flex: 1, justifyContent: 'space-between', paddingVertical: 2, gap: 4 },
        gridSection: { alignItems: 'center', justifyContent: 'center' },
        message: {
          textAlign: 'center',
          color: SOFRA_LETTER_COLOR,
          fontSize: 12,
          fontWeight: '800',
          height: MESSAGE_H,
          lineHeight: MESSAGE_H,
        },
        wheelSection: { alignItems: 'center', justifyContent: 'flex-end' },
      }),
    [],
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
    const task = InteractionManager.runAfterInteractions(() => {
      void (async () => {
        setLoading(true);
        const daily = getDailySofraPuzzle(activePuzzleId(), zorluk);
        const saved = await loadSofraProgress(daily);
        if (!alive) return;
        setPuzzle(daily);
        setProgress(saved);
        setLoading(false);
        if (!saved.completedAt) startTimer();
        else if (EGLENCE_GUNLUK_TEK_OYUN) setResultOpen(true);
      })();
    });
    return () => {
      alive = false;
      task.cancel();
      stopTimer();
    };
  }, [startTimer, stopTimer, zorluk]);

  useEffect(() => {
    if (!progress) return;
    void saveSofraProgress(progress);
  }, [progress]);

  const completed = EGLENCE_GUNLUK_TEK_OYUN && progress?.completedAt != null;

  useEffect(() => {
    if (!message) return;
    const ms = message.startsWith('İpucu:') ? 5000 : 1600;
    const t = setTimeout(() => setMessage(null), ms);
    return () => clearTimeout(t);
  }, [message]);

  const submitPath = useCallback(
    (path: number[]) => {
      if (!puzzle || !progress || completed) {
        setSelectedPath([]);
        return;
      }
      if (path.length < SOFRA_MIN_KELIME_UZUNLUGU) {
        setSelectedPath([]);
        return;
      }
      const word = path.map((i) => puzzle.wheel[i]).join('');
      const norm = normalizeKelime(word);
      if (!kelimeCarktanOlusur(word, puzzle.wheel, path)) {
        setMessage('Harfleri sırayla seç');
        setSelectedPath([]);
        return;
      }
      const target = hedefKelimeMi(puzzle, word);
      if (!target) {
        if (bonusKelimeMi(puzzle, word)) {
          if (progress.bonusFound.some((b) => normalizeKelime(b) === norm)) {
            setMessage('Bonus zaten bulundu');
            setSelectedPath([]);
            return;
          }
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setProgress({
            ...progress,
            bonusFound: [...progress.bonusFound, norm],
          });
          setSelectedPath([]);
          setMessage(`Bonus: ${norm}`);
          return;
        }
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setMessage('Sözlükte yok — ızgaradaki kelimelere odaklan');
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
    },
    [completed, puzzle, progress, stopTimer, user],
  );

  const handlePathChange = useCallback((path: number[]) => {
    setSelectedPath(path);
  }, []);

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

  const onHint = useCallback(async () => {
    if (!puzzle || !progress || completed) return;
    if (!ipucuHakkiKaldi(progress.hintedCells.length)) {
      setMessage('İpucu hakkın bitti');
      return;
    }
    const hintIndex = progress.hintedCells.length;
    if (hintIndex >= SOFRA_FREE_IPUCU && user?.email) {
      try {
        const spend = await spendGameHint({
          userEmail: user.email,
          game: 'kelime_sofrasi',
          puzzleId: puzzle.id,
          hintIndex,
        });
        if (!spend.ok) {
          setMessage('Yeterli jeton yok');
          return;
        }
      } catch {
        setMessage('Jeton harcanamadı, tekrar dene');
        return;
      }
    }
    const cell = sonrakiIpucuHucresi(
      puzzle,
      progress.foundWordIds,
      progress.hintedCells,
      Math.random,
    );
    if (!cell) {
      setMessage('Açılacak kutu kalmadı');
      return;
    }
    const key = hucreAnahtar(cell.row, cell.col);
    if (progress.hintedCells.includes(key)) return;

    setProgress({
      ...progress,
      hintedCells: [...progress.hintedCells, key],
    });
    setMessage(`İpucu: ${cell.letter}`);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [completed, puzzle, progress, user?.email]);

  const hintsLeft = progress ? Math.max(0, SOFRA_MAX_IPUCU - progress.hintedCells.length) : 0;

  if (
    loading ||
    !puzzle?.words?.length ||
    !puzzle?.wheel?.length ||
    !progress?.foundWordIds ||
    !progress?.bonusFound ||
    !progress?.hintedCells
  ) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const foundCount = progress.foundWordIds.length;
  const totalCount = puzzle.words.length;
  const bonusCount = progress.bonusFound.length;
  const bonusTotal = puzzle.bonusKelimeler?.length ?? 0;

  return (
    <Screen scroll={false} flush edges={['left', 'right', 'bottom']}>
      <View style={styles.root}>
        <Image
          source={sofraBackgroundForPuzzle(puzzle.id)}
          style={styles.bgImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          pointerEvents="none"
        />

        <View style={styles.content}>
          <View style={styles.topBlock}>
            <View style={styles.metaRow}>
              <Text style={styles.progress}>
                Bulmaca {foundCount}/{totalCount}
              </Text>
              <Text style={styles.timer}>{formatElapsed(progress.elapsedMs)}</Text>
            </View>
            <Text style={styles.bonusMeta}>
              {puzzle.zorluk === 'kolay' ? 'Kolay' : puzzle.zorluk === 'zor' ? 'Zor' : 'Orta'} · Bonus{' '}
              {bonusCount}/{bonusTotal} · {puzzle.wheel.length} harf
            </Text>
            <Text style={styles.meta}>{formatNextResetHint()}</Text>
          </View>

          <View style={styles.playArea}>
            <View style={styles.gridSection}>
            <KelimeSofrasiGrid
              grid={puzzle.grid}
              foundWordIds={progress.foundWordIds}
              hintedCells={progress.hintedCells}
              cellSize={layout.cellSize}
              compact={layout.compact}
            />
              <Text style={styles.message}>{message ?? ' '}</Text>
            </View>

            <View style={styles.wheelSection}>
              <KelimeSofrasiWheel
                wheel={puzzle.wheel}
                order={progress.wheelOrder}
                selectedPath={selectedPath}
                diameter={layout.wheelDiameter}
                onPathChange={handlePathChange}
              onCommit={submitPath}
              onShuffle={onShuffle}
              onHint={onHint}
              hintsLeft={hintsLeft}
              disabled={completed}
              />
            </View>
          </View>
        </View>
      </View>

      <EglenceResultModal
        visible={resultOpen}
        onClose={() => {
          setResultOpen(false);
          if (EGLENCE_GUNLUK_TEK_OYUN && progress.completedAt) {
            router.replace('/(tabs)/eglence' as Href);
          }
        }}
        game="kelime_sofrasi"
        periodKey={puzzle.id}
        elapsedMs={progress.elapsedMs}
      />
    </Screen>
  );
}
