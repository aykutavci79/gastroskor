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
import { SofraBonusBadge } from '@/components/kelime-sofrasi/SofraBonusBadge';
import { Screen } from '@/components/ui/Screen';
import { sofraBackgroundForPuzzle } from '@/constants/regional-flavor-images';
import { parseEglenceZorluk } from '@/constants/eglence-zorluk';
import {
  SOFRA_BONUS_HINT_THRESHOLD,
  SOFRA_FREE_IPUCU,
  SOFRA_GUNLUK_TAMAMLAMA_LIMIT,
  SOFRA_MIN_KELIME_UZUNLUGU,
} from '@/constants/kelime-sofrasi';
import { logWheelAttempt } from '@/lib/kelime-sofrasi/attempt-log';
import { useGastroTheme } from '@/context/theme-context';
import { useSession } from '@/context/session-context';
import { spendGameHint } from '@/lib/api';
import { notifyFriendsEglenceActivity } from '@/lib/eglence-friend-activity';
import { EGLENCE_LOBBY_ROUTES } from '@/lib/eglence-lobby-routes';
import { scoreKelimeSofrasi } from '@/lib/eglence-scoring';
import {
  bonusKelimeMi,
  bulmacaTamamlandi,
  carkKaristir,
  hedefKelimeMi,
  hucreAnahtar,
  ipucuHakkiKaldi,
  autoSolveFullyRevealedWordIds,
  kelimeCarktanOlusur,
  normalizeKelime,
  sameAxisPrefixOfUnfoundLonger,
  sameAxisSubstringSpoiler,
  sonrakiIpucuHucresi,
  sofraMaxIpucu,
} from '@/lib/kelime-sofrasi/engine';
import {
  ensureSofraPuzzleAsync,
  prefetchSofraOtherZorluklarIdle,
  prefetchSofraTurIdle,
} from '@/lib/kelime-sofrasi/puzzle-cache';
import {
  sofraGunlukLimitDoldu,
  sofraTamamlamaSayisi,
} from '@/lib/kelime-sofrasi/sofra-gunluk-limit';
import { activePuzzleId } from '@/lib/mini-sudoku/schedule';
import {
  beginNextSofraRound,
  loadSofraProgress,
  resolveSofraSessionTur,
  saveSofraProgress,
} from '@/lib/kelime-sofrasi/storage';
import type { SofraProgress, SofraPuzzle } from '@/lib/kelime-sofrasi/types';
import { mulberry32, seedFromString } from '@/lib/mini-sudoku/rng';

const STACK_HEADER = 48;
const WHEEL_TOOLBAR_H = 34;
const WHEEL_PREVIEW_H = 10;
const META_BLOCK_H = 22;
const MESSAGE_H = 14;
const GRID_CELL_MIN = 26;

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function SofraElapsedTimer({
  initialMs,
  running,
  onElapsed,
  style,
}: {
  initialMs: number;
  running: boolean;
  onElapsed: (ms: number) => void;
  style: { color: string; fontWeight: '800'; fontSize: number };
}) {
  const [displayMs, setDisplayMs] = useState(initialMs);

  useEffect(() => {
    setDisplayMs(initialMs);
    onElapsed(initialMs);
  }, [initialMs, onElapsed]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setDisplayMs((prev) => {
        const next = prev + 1000;
        onElapsed(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, onElapsed]);

  return <Text style={style}>{formatElapsed(displayMs)}</Text>;
}

function useSofraLayout(puzzle: SofraPuzzle | null) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    if (!puzzle) {
      return { cellSize: 40, wheelDiameter: 220, compact: true };
    }

    const usableW = width - 8;
    const usableH = height - insets.top - insets.bottom - STACK_HEADER;
    const chromeH = META_BLOCK_H + MESSAGE_H + 2;
    const wheelChromeH = WHEEL_PREVIEW_H + WHEEL_TOOLBAR_H + 2;
    const playH = Math.max(340, usableH - chromeH);

    const cellGap = 2;
    const gridPad = 2;
    const cellFromWidth = Math.floor((usableW - puzzle.cols * cellGap) / puzzle.cols);

    const cellSizeForGridBudget = (gridBudgetH: number) => {
      const cellFromHeight = Math.floor((gridBudgetH - gridPad) / puzzle.rows - cellGap);
      return Math.max(GRID_CELL_MIN, Math.min(cellFromWidth, cellFromHeight));
    };

    let wheelDiameter = Math.floor(usableW * 0.8);
    const minWheel = Math.floor(usableW * 0.65);
    let cellSize = cellSizeForGridBudget(playH - wheelDiameter - wheelChromeH - 6);

    for (let attempt = 0; attempt < 24; attempt++) {
      const gridBudgetH = playH - wheelDiameter - wheelChromeH - 6;
      cellSize = cellSizeForGridBudget(gridBudgetH);
      const gridH = puzzle.rows * (cellSize + cellGap) + gridPad;
      if (gridH + wheelDiameter + wheelChromeH <= playH) break;
      wheelDiameter = Math.max(minWheel, wheelDiameter - 8);
    }

    wheelDiameter = Math.max(minWheel, wheelDiameter);
    cellSize = cellSizeForGridBudget(playH - wheelDiameter - wheelChromeH - 6);

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
  const [resultScore, setResultScore] = useState<{ score: number; detail: string } | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [bgReady, setBgReady] = useState(false);
  const elapsedRef = useRef(0);
  const progressRef = useRef<SofraProgress | null>(null);
  const saveGenRef = useRef(0);
  const notifiedRef = useRef(false);
  const resultElapsedRef = useRef(0);
  const resultPuzzleIdRef = useRef<string | null>(null);
  const layout = useSofraLayout(puzzle);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1 },
        bgImage: { ...StyleSheet.absoluteFillObject, opacity: 1 },
        bgImageHidden: { opacity: 0 },
        content: {
          flex: 1,
          paddingHorizontal: 4,
          paddingTop: 2,
          paddingBottom: 4,
        },
        topBlock: { height: META_BLOCK_H, justifyContent: 'center', alignItems: 'flex-end' },
        timer: { color: colors.text, fontWeight: '800', fontSize: 14 },
        playArea: { flex: 1, justifyContent: 'space-between', paddingVertical: 0, gap: 2 },
        gridSection: { alignItems: 'center', justifyContent: 'flex-start', flexShrink: 1 },
        wheelSection: {
          width: '100%',
          alignItems: 'center',
          justifyContent: 'flex-end',
          position: 'relative',
        },
        bonusBadgeAnchor: {
          position: 'absolute',
          left: 0,
          bottom: WHEEL_TOOLBAR_H + 2,
        },
        message: {
          textAlign: 'center',
          color: colors.text,
          fontSize: 12,
          fontWeight: '800',
          height: MESSAGE_H,
          lineHeight: MESSAGE_H,
        },
      }),
    [colors.text],
  );

  const onElapsed = useCallback((ms: number) => {
    elapsedRef.current = ms;
  }, []);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const persistProgress = useCallback(async (patch?: Partial<SofraProgress>) => {
    const current = progressRef.current;
    if (!current || current.completedAt) return;
    const gen = ++saveGenRef.current;
    const merged = { ...current, ...patch, elapsedMs: elapsedRef.current };
    await saveSofraProgress(merged);
    if (gen !== saveGenRef.current) return;
    progressRef.current = merged;
  }, []);

  useEffect(() => {
    if (!progress || progress.completedAt) return;
    void persistProgress();
  }, [
    progress?.puzzleId,
    progress?.foundWordIds,
    progress?.bonusFound,
    progress?.hintedCells,
    progress?.wheelOrder,
    persistProgress,
  ]);

  useEffect(() => {
    if (!progress || progress.completedAt) return;
    const id = setInterval(() => {
      void persistProgress();
    }, 15000);
    return () => clearInterval(id);
  }, [progress, persistProgress]);

  useEffect(() => {
    return () => {
      const current = progressRef.current;
      if (!current || current.completedAt) return;
      void saveSofraProgress({ ...current, elapsedMs: elapsedRef.current });
    };
  }, []);

  useEffect(() => {
    const gunId = activePuzzleId();
    let alive = true;

    setLoading(true);
    setPuzzle(null);
    setProgress(null);
    setBgReady(false);
    setSelectedPath([]);
    setMessage(null);
    setTimerRunning(false);

    void (async () => {
      try {
        const tur = await resolveSofraSessionTur(gunId, zorluk);
        const daily = await ensureSofraPuzzleAsync(gunId, zorluk, tur);
        if (!alive) return;
        const saved = await loadSofraProgress(daily, gunId, zorluk);
        if (!alive) return;
        setPuzzle(daily);
        setProgress(saved);
        progressRef.current = saved;
        elapsedRef.current = saved.elapsedMs;
        setLoading(false);

        if (!sofraGunlukLimitDoldu(saved)) {
          prefetchSofraTurIdle(gunId, zorluk, tur + 1);
        }

        if (sofraGunlukLimitDoldu(saved)) {
          setTimerRunning(false);
          setResultOpen(true);
          return;
        }
        setTimerRunning(true);
        notifiedRef.current = false;
      } catch {
        if (alive) setLoading(false);
      }
    })();

    prefetchSofraOtherZorluklarIdle(gunId, zorluk);

    const bgTask = InteractionManager.runAfterInteractions(() => {
      if (alive) setBgReady(true);
    });

    return () => {
      alive = false;
      bgTask.cancel?.();
      setTimerRunning(false);
    };
  }, [zorluk]);

  const completed =
    progress?.completedAt != null || sofraGunlukLimitDoldu(progress);

  useEffect(() => {
    if (!message) return;
    const ms = message.startsWith('İpucu:') ? 5000 : 1600;
    const t = setTimeout(() => setMessage(null), ms);
    return () => clearTimeout(t);
  }, [message]);

  const applyFoundWordIds = useCallback(
    (baseProgress: SofraProgress, foundWordIds: string[], successMessage?: string) => {
      if (!puzzle) return;
      const done = bulmacaTamamlandi(puzzle, foundWordIds);
      const nextTamamlama = done
        ? sofraTamamlamaSayisi(baseProgress) + 1
        : sofraTamamlamaSayisi(baseProgress);
      if (done) {
        const completedProgress: SofraProgress = {
          ...baseProgress,
          foundWordIds,
          completedAt: new Date().toISOString(),
          elapsedMs: elapsedRef.current,
          gunlukTamamlamaSayisi: nextTamamlama,
        };
        const limitMsg =
          nextTamamlama >= SOFRA_GUNLUK_TAMAMLAMA_LIMIT
            ? 'Sofra tamam! Bugünlük hakkın doldu.'
            : `Sofra tamam! (${nextTamamlama}/${SOFRA_GUNLUK_TAMAMLAMA_LIMIT})`;
        setMessage(successMessage ?? limitMsg);
        setTimerRunning(false);
        const scoreResult = scoreKelimeSofrasi({
          elapsedMs: elapsedRef.current,
          hintsUsed: completedProgress.hintedCells.length,
        });
        setResultScore(scoreResult);
        resultElapsedRef.current = elapsedRef.current;
        resultPuzzleIdRef.current = puzzle.id;
        setResultOpen(true);
        if (!notifiedRef.current && user) {
          notifiedRef.current = true;
          void notifyFriendsEglenceActivity(user?.email, {
            game: 'kelime_sofrasi',
            puzzleId: puzzle.id,
            elapsedMs: elapsedRef.current,
            score: scoreResult.score,
          });
        }
        if (sofraGunlukLimitDoldu(completedProgress)) {
          progressRef.current = completedProgress;
          setProgress(completedProgress);
          void saveSofraProgress(completedProgress);
          return;
        }
        saveGenRef.current += 1;
        const gunId = activePuzzleId();
        void ensureSofraPuzzleAsync(gunId, zorluk, nextTamamlama).then((nextPuzzle) => {
          void beginNextSofraRound(nextPuzzle, nextTamamlama).then((next) => {
            setPuzzle(nextPuzzle);
            progressRef.current = next;
            setProgress(next);
            elapsedRef.current = 0;
            setSelectedPath([]);
            setBgReady(false);
            InteractionManager.runAfterInteractions(() => setBgReady(true));
            if (nextTamamlama + 1 < SOFRA_GUNLUK_TAMAMLAMA_LIMIT) {
              prefetchSofraTurIdle(gunId, zorluk, nextTamamlama + 1);
            }
          });
        });
        return;
      }
      setProgress({
        ...baseProgress,
        foundWordIds,
        completedAt: null,
        elapsedMs: elapsedRef.current,
        gunlukTamamlamaSayisi: nextTamamlama,
      });
      if (successMessage) setMessage(successMessage);
    },
    [puzzle, user, zorluk],
  );

  const submitPath = useCallback(
    (path: number[]) => {
      if (!puzzle || !progress || completed || resultOpen) {
        setSelectedPath([]);
        return;
      }
      if (path.length < SOFRA_MIN_KELIME_UZUNLUGU) {
        if (path.length === 2) {
          setMessage('2 harf ayrı kelime değil — 3+ harfli ızgara kelimesi yaz');
        }
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
      if (norm.length >= SOFRA_MIN_KELIME_UZUNLUGU) {
        logWheelAttempt(norm);
      }
      const longerKutu = sameAxisPrefixOfUnfoundLonger(
        puzzle.words,
        norm,
        progress.foundWordIds,
      );
      if (longerKutu) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setMessage(
          `${longerKutu.kelime.length} harfli kutu — ${longerKutu.kelime} yaz (${norm.length} harf yetmez)`,
        );
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
          const nextBonus = [...progress.bonusFound, norm];
          const prevTier = Math.floor(progress.bonusFound.length / SOFRA_BONUS_HINT_THRESHOLD);
          const nextTier = Math.floor(nextBonus.length / SOFRA_BONUS_HINT_THRESHOLD);
          setProgress({
            ...progress,
            bonusFound: nextBonus,
            elapsedMs: elapsedRef.current,
          });
          setSelectedPath([]);
          if (nextTier > prevTier) {
            setMessage(`Bonus: ${norm} — +1 ipucu kazandın!`);
          } else {
            setMessage(`Bonus: ${norm}`);
          }
          return;
        }
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setMessage(
          norm.length <= 3
            ? 'Bonus değil — çarktaki harflerle başka kısa kelime dene'
            : 'Sözlükte yok — ızgaradaki kelimelere odaklan',
        );
        setSelectedPath([]);
        return;
      }
      if (progress.foundWordIds.includes(target.id)) {
        setMessage('Zaten bulundu');
        setSelectedPath([]);
        return;
      }
      const spoiler = sameAxisSubstringSpoiler(puzzle.words, target, progress.foundWordIds);
      if (spoiler) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setMessage(
          `${target.kelime} ipucu verir — önce ${spoiler.kelime} (${spoiler.kelime.length} harf) bul`,
        );
        setSelectedPath([]);
        return;
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const foundWordIds = [...progress.foundWordIds, target.id];
      setSelectedPath([]);
      applyFoundWordIds(progress, foundWordIds, `+ ${target.kelime}`);
    },
    [applyFoundWordIds, completed, puzzle, progress, resultOpen],
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
      elapsedMs: elapsedRef.current,
    });
    setSelectedPath([]);
    setMessage(null);
  }, [completed, puzzle, progress]);

  const onHint = useCallback(async () => {
    if (!puzzle || !progress || completed) return;
    if (!ipucuHakkiKaldi(progress.hintedCells.length, progress.bonusFound.length)) {
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

    const nextHinted = [...progress.hintedCells, key];
    const autoIds = autoSolveFullyRevealedWordIds(
      puzzle,
      progress.foundWordIds,
      nextHinted,
    );
    const nextProgress: SofraProgress = {
      ...progress,
      hintedCells: nextHinted,
      elapsedMs: elapsedRef.current,
    };
    setMessage(`İpucu: ${cell.letter}`);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (autoIds.length) {
      const foundWordIds = [...progress.foundWordIds, ...autoIds];
      const labels = puzzle.words
        .filter((w) => autoIds.includes(w.id))
        .map((w) => w.kelime)
        .join(', ');
      applyFoundWordIds(nextProgress, foundWordIds, labels ? `+ ${labels}` : undefined);
      return;
    }
    setProgress(nextProgress);
  }, [applyFoundWordIds, completed, puzzle, progress, user?.email]);

  const hintsLeft = progress
    ? Math.max(0, sofraMaxIpucu(progress.bonusFound.length) - progress.hintedCells.length)
    : 0;

  if (
    loading ||
    !puzzle?.words?.length ||
    !puzzle?.wheel?.length ||
    !progress?.foundWordIds ||
    !progress?.bonusFound ||
    !progress?.hintedCells
  ) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={{ color: colors.muted, fontWeight: '700' }}>Sofra hazırlanıyor…</Text>
      </View>
    );
  }

  const bonusCount = progress.bonusFound.length;

  return (
    <Screen scroll={false} flush edges={['left', 'right', 'bottom']}>
      <View style={styles.root}>
        <Image
          source={sofraBackgroundForPuzzle(puzzle.id)}
          style={[styles.bgImage, !bgReady ? styles.bgImageHidden : null]}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
          recyclingKey={puzzle.id}
          priority="low"
          pointerEvents="none"
        />

        <View style={styles.content}>
          <View style={styles.topBlock}>
            <SofraElapsedTimer
              initialMs={progress.elapsedMs}
              running={timerRunning}
              onElapsed={onElapsed}
              style={styles.timer}
            />
          </View>

          <View style={styles.playArea}>
            <View style={styles.gridSection}>
            <KelimeSofrasiGrid
              grid={puzzle.grid}
              foundWordIds={progress.foundWordIds}
              words={puzzle.words}
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
                disabled={completed || resultOpen}
              />
              <View style={styles.bonusBadgeAnchor} pointerEvents="box-none">
                <SofraBonusBadge bonusFoundCount={bonusCount} />
              </View>
            </View>
          </View>
        </View>
      </View>

      <EglenceResultModal
        visible={resultOpen}
        onClose={() => setResultOpen(false)}
        onDone={() => {
          setResultOpen(false);
          router.replace(EGLENCE_LOBBY_ROUTES['kelime-sofrasi'] as Href);
        }}
        game="kelime_sofrasi"
        periodKey={resultPuzzleIdRef.current ?? puzzle.id}
        elapsedMs={resultElapsedRef.current || progress.elapsedMs}
        score={resultScore?.score}
        scoreDetail={resultScore?.detail}
      />
    </Screen>
  );
}
