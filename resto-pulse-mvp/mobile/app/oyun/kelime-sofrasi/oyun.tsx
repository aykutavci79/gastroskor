import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useGastroPostHog } from '@/lib/gastro-posthog';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  InteractionManager,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KelimeSofrasiGrid } from '@/components/kelime-sofrasi/KelimeSofrasiGrid';
import { KelimeSofrasiWheel } from '@/components/kelime-sofrasi/KelimeSofrasiWheel';
import { SofraBonusBadge } from '@/components/kelime-sofrasi/SofraBonusBadge';
import { SofraHintButton } from '@/components/kelime-sofrasi/SofraHintButton';
import { Screen } from '@/components/ui/Screen';
import { sofraBackgroundForPuzzle } from '@/constants/regional-flavor-images';
import { parseEglenceZorluk } from '@/constants/eglence-zorluk';
import {
  SOFRA_BG_COVER_FRAC,
  SOFRA_BONUS_HINT_THRESHOLD,
  SOFRA_FREE_IPUCU,
  SOFRA_GUNLUK_TAMAMLAMA_LIMIT,
  SOFRA_GUNLUK_TAMAMLAMA_LIMIT_PROD,
  SOFRA_MIN_KELIME_UZUNLUGU,
} from '@/constants/kelime-sofrasi';
import { logWheelAttempt } from '@/lib/kelime-sofrasi/attempt-log';
import { useGastroTheme } from '@/context/theme-context';
import { useSession } from '@/context/session-context';
import { spendGameHint } from '@/lib/api';
import { notifyFriendsEglenceActivity } from '@/lib/eglence-friend-activity';
import { formatChallengeElapsed } from '@/lib/eglence-challenge-share';
import { playHubSfx } from '@/lib/gastro-hub-sfx';
import { EGLENCE_LOBBY_ROUTES } from '@/lib/eglence-lobby-routes';
import { scoreKelimeSofrasi } from '@/lib/eglence-scoring';
import {
  bonusKelimeMi,
  bonusIpucuIlerleme,
  bulmacaTamamlandi,
  carkKaristir,
  hedefKelimeMi,
  hucreAnahtar,
  ipucuHakkiKaldi,
  autoSolveFullyRevealedWordIds,
  kelimeCarktanOlusur,
  normalizeKelime,
  partialOfUnfoundLongerTarget,
  sameAxisSubstringSpoiler,
  sonrakiIpucuHucresi,
  sofraBonusHintTiersClaimed,
  sofraDailyHintsUsed,
  sofraIpucuKalan,
  sofraPendingBonusHintClaims,
} from '@/lib/kelime-sofrasi/engine';
import {
  ensureSofraPuzzleAsync,
  prefetchSofraTurIdle,
} from '@/lib/kelime-sofrasi/puzzle-cache';
import {
  sofraGunlukLimitDoldu,
  sofraTamamlamaSayisi,
} from '@/lib/kelime-sofrasi/sofra-gunluk-limit';
import {
  beginNextSofraRound,
  loadSofraProgress,
  resolveSofraSessionTur,
  saveSofraProgress,
} from '@/lib/kelime-sofrasi/storage';
import { clampSofraGunId } from '@/lib/kelime-sofrasi/sofra-archive';
import type { SofraProgress, SofraPuzzle } from '@/lib/kelime-sofrasi/types';
import { mulberry32, seedFromString } from '@/lib/mini-sudoku/rng';

const STACK_HEADER = 48;
const WHEEL_TOOLBAR_H = 0;
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
  const posthog = useGastroPostHog();
  const { colors } = useGastroTheme();
  const { user } = useSession();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { zorluk: zorlukParam, gun_id: gunIdParam } = useLocalSearchParams<{
    zorluk?: string;
    gun_id?: string | string[];
  }>();
  const zorluk = parseEglenceZorluk(zorlukParam);
  const gunId = useMemo(() => {
    const raw = Array.isArray(gunIdParam) ? gunIdParam[0] : gunIdParam;
    return clampSofraGunId(raw);
  }, [gunIdParam]);
  const [puzzle, setPuzzle] = useState<SofraPuzzle | null>(null);
  const [progress, setProgress] = useState<SofraProgress | null>(null);
  const [selectedPath, setSelectedPath] = useState<number[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadRetryTick, setLoadRetryTick] = useState(0);
  const [roundComplete, setRoundComplete] = useState(false);
  const [nextRoundLoading, setNextRoundLoading] = useState(false);
  const [resultScore, setResultScore] = useState<{ score: number; detail: string } | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [bgReady, setBgReady] = useState(false);
  const elapsedRef = useRef(0);
  const progressRef = useRef<SofraProgress | null>(null);
  const saveGenRef = useRef(0);
  const notifiedRef = useRef(false);
  const resultElapsedRef = useRef(0);
  const resultPuzzleIdRef = useRef<string | null>(null);
  const wheelAttemptRef = useRef(0);
  const loadStartedAtRef = useRef(0);
  const layout = useSofraLayout(puzzle);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1 },
        bgWrap: {
          ...StyleSheet.absoluteFillObject,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        },
        bgCoverStage: {
          width: `${SOFRA_BG_COVER_FRAC * 100}%`,
          height: `${SOFRA_BG_COVER_FRAC * 100}%`,
          transform: [{ scale: 1 / SOFRA_BG_COVER_FRAC }],
        },
        bgImage: {
          ...StyleSheet.absoluteFillObject,
          opacity: 1,
        },
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
          overflow: 'visible',
        },
        bonusBadgeAnchor: {
          position: 'absolute',
          left: 0,
          bottom: WHEEL_TOOLBAR_H + 2,
          overflow: 'visible',
          paddingTop: 14,
        },
        hintBadgeAnchor: {
          position: 'absolute',
          right: 0,
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
        completeBar: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 12,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 10),
          backgroundColor: 'rgba(8, 8, 12, 0.92)',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: 'rgba(255,255,255,0.12)',
          gap: 10,
        },
        completeTitle: {
          color: '#fff',
          fontSize: 18,
          fontWeight: '900',
          textAlign: 'center',
        },
        completeSub: {
          color: 'rgba(255,255,255,0.72)',
          fontSize: 13,
          textAlign: 'center',
          lineHeight: 18,
        },
        completeActions: {
          flexDirection: 'row',
          gap: 10,
        },
        completeBtn: {
          flex: 1,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
        },
        completeBtnPrimary: {
          backgroundColor: colors.accent,
        },
        completeBtnSecondary: {
          backgroundColor: 'rgba(255,255,255,0.12)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.18)',
        },
        completeBtnText: {
          color: '#fff',
          fontSize: 15,
          fontWeight: '800',
        },
      }),
    [colors.accent, colors.text, insets.bottom],
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
    await saveSofraProgress(merged, gunId, zorluk);
    if (gen !== saveGenRef.current) return;
    progressRef.current = merged;
  }, [gunId, zorluk]);

  useEffect(() => {
    if (!progress || progress.completedAt) return;
    void persistProgress();
  }, [
    progress?.puzzleId,
    progress?.foundWordIds,
    progress?.bonusFound,
    progress?.bonusHintTiersClaimed,
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
      void saveSofraProgress({ ...current, elapsedMs: elapsedRef.current }, gunId, zorluk);
    };
  }, [gunId, zorluk]);

  useEffect(() => {
    let alive = true;

    loadStartedAtRef.current = Date.now();
    wheelAttemptRef.current = 0;
    setLoading(true);
    setLoadError(null);
    setPuzzle(null);
    setProgress(null);
    setBgReady(false);
    setSelectedPath([]);
    setMessage(null);
    setRoundComplete(false);
    setResultScore(null);
    setTimerRunning(false);

    void (async () => {
      const t0 = __DEV__ ? Date.now() : 0;
      const step = (label: string) => {
        if (__DEV__) console.log(`[sofra-oyun] ${label} (+${Date.now() - t0}ms)`);
      };
      try {
        step('tur çözümleme');
        const tur = await resolveSofraSessionTur(gunId, zorluk);
        step(`bulmaca tur=${tur}`);
        const daily = await ensureSofraPuzzleAsync(gunId, zorluk, tur, user?.email);
        if (!alive) return;
        step('ilerleme yükleme');
        const saved = await loadSofraProgress(daily, gunId, zorluk);
        if (!alive) return;
        step('hazır');
        setPuzzle(daily);
        setProgress(saved);
        progressRef.current = saved;
        elapsedRef.current = saved.elapsedMs;
        setLoading(false);
        posthog.capture('game_load_time', {
          screen: 'kelime_sofrasi',
          duration_ms: Date.now() - loadStartedAtRef.current,
          gun_id: gunId,
        });

        if (!sofraGunlukLimitDoldu(saved)) {
          prefetchSofraTurIdle(gunId, zorluk, tur + 1);
        }

        if (sofraGunlukLimitDoldu(saved)) {
          setTimerRunning(false);
          const scoreResult = scoreKelimeSofrasi({
            elapsedMs: saved.elapsedMs,
            hintsUsed: sofraDailyHintsUsed(saved),
          });
          setResultScore(scoreResult);
          resultElapsedRef.current = saved.elapsedMs;
          resultPuzzleIdRef.current = daily.id;
          setRoundComplete(true);
          return;
        }
        setTimerRunning(true);
        posthog.capture('kelime_sofrasi_started', {
          puzzle_id: daily.id,
          difficulty: zorluk,
          gun_id: gunId,
        });
        notifiedRef.current = false;
      } catch (err) {
        if (alive) {
          setLoading(false);
          setLoadError(
            err instanceof Error && err.message.includes('Sofra bulmacasi yuklenemedi')
              ? 'Sofra bulmacasi hazirlanamadi. Interneti kontrol edip tekrar dene.'
              : 'Sofra yuklenemedi. Tekrar dene.',
          );
          posthog.capture('game_error', {
            screen: 'kelime_sofrasi',
            error_message: err instanceof Error ? err.message : 'load_failed',
            gun_id: gunId,
          });
          if (__DEV__) console.warn('[sofra-oyun] load failed', err);
        }
      }
    })();

    const bgTask = InteractionManager.runAfterInteractions(() => {
      if (alive) setBgReady(true);
    });

    return () => {
      alive = false;
      bgTask.cancel?.();
      setTimerRunning(false);
    };
  }, [gunId, user?.email, zorluk, posthog, loadRetryTick]);

  const completed =
    progress?.completedAt != null || sofraGunlukLimitDoldu(progress) || roundComplete;

  const handleExitToLobby = useCallback(() => {
    router.replace(EGLENCE_LOBBY_ROUTES['kelime-sofrasi'] as Href);
  }, [router]);

  const handleNextRound = useCallback(async () => {
    const current = progressRef.current;
    if (!current || sofraGunlukLimitDoldu(current)) return;

    const nextTamamlama = sofraTamamlamaSayisi(current);

    setRoundComplete(false);
    setResultScore(null);
    setMessage(null);
    setSelectedPath([]);
    setNextRoundLoading(true);

    try {
      const nextPuzzle = await ensureSofraPuzzleAsync(gunId, zorluk, nextTamamlama, user?.email);
      const next = await beginNextSofraRound(nextPuzzle, nextTamamlama, gunId, zorluk, {
        bonusFound: current.bonusFound,
        dailyHintsUsed: sofraDailyHintsUsed(current),
        bonusHintTiersClaimed: sofraBonusHintTiersClaimed(current),
      });
      setPuzzle(nextPuzzle);
      progressRef.current = next;
      setProgress(next);
      elapsedRef.current = 0;
      setBgReady(false);
      setTimerRunning(true);
      notifiedRef.current = false;
      wheelAttemptRef.current = 0;
      InteractionManager.runAfterInteractions(() => setBgReady(true));
      if (nextTamamlama + 1 < SOFRA_GUNLUK_TAMAMLAMA_LIMIT) {
        prefetchSofraTurIdle(gunId, zorluk, nextTamamlama + 1);
      }
    } catch (err) {
      posthog.capture('game_error', {
        screen: 'kelime_sofrasi',
        error_message: err instanceof Error ? err.message : 'next_round_failed',
      });
      setMessage('Sonraki tur yüklenemedi');
      setRoundComplete(true);
    } finally {
      setNextRoundLoading(false);
    }
  }, [gunId, posthog, user?.email, zorluk]);

  useEffect(() => {
    if (!message) return;
    const ms = message.startsWith('İpucu:') ? 5000 : 1600;
    const t = setTimeout(() => setMessage(null), ms);
    return () => clearTimeout(t);
  }, [message]);

  const applyFoundWordIds = useCallback(
    (baseProgress: SofraProgress, foundWordIds: string[], successMessage?: string) => {
      if (!puzzle) return;
      if (foundWordIds.length > baseProgress.foundWordIds.length) {
        const prev = new Set(baseProgress.foundWordIds);
        const newlyFound = puzzle.words.filter(
          (w) => foundWordIds.includes(w.id) && !prev.has(w.id),
        );
        for (const word of newlyFound) {
          posthog.capture('kelime_sofrasi_word_found', {
            word: word.kelime,
            attempt_number: wheelAttemptRef.current,
          });
        }
        const maxLen = Math.max(
          ...puzzle.words.map((w) => normalizeKelime(w.kelime).length),
          0,
        );
        const foundLongest = puzzle.words.some(
          (w) =>
            foundWordIds.includes(w.id) &&
            !prev.has(w.id) &&
            normalizeKelime(w.kelime).length === maxLen,
        );
        if (foundLongest) playHubSfx('applause');
      }
      const done = bulmacaTamamlandi(puzzle, foundWordIds);
      const nextTamamlama = done
        ? sofraTamamlamaSayisi(baseProgress) + 1
        : sofraTamamlamaSayisi(baseProgress);
      if (done) {
        posthog.capture('kelime_sofrasi_completed', {
          puzzle_id: puzzle.id,
          duration_seconds: Math.round(elapsedRef.current / 1000),
          success: true,
        });
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
            : `Sofra tamam! (${Math.min(nextTamamlama, SOFRA_GUNLUK_TAMAMLAMA_LIMIT_PROD)}/${SOFRA_GUNLUK_TAMAMLAMA_LIMIT_PROD})`;
        setMessage(successMessage ?? limitMsg);
        setTimerRunning(false);
        const scoreResult = scoreKelimeSofrasi({
          elapsedMs: elapsedRef.current,
          hintsUsed: sofraDailyHintsUsed(completedProgress),
        });
        setResultScore(scoreResult);
        resultElapsedRef.current = elapsedRef.current;
        resultPuzzleIdRef.current = puzzle.id;
        progressRef.current = completedProgress;
        setProgress(completedProgress);
        void saveSofraProgress(completedProgress, gunId, zorluk);
        playHubSfx('finish');
        setRoundComplete(true);
        if (!notifiedRef.current && user) {
          notifiedRef.current = true;
          void notifyFriendsEglenceActivity(user?.email, {
            game: 'kelime_sofrasi',
            puzzleId: puzzle.id,
            elapsedMs: elapsedRef.current,
            score: scoreResult.score,
          });
        }
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
    [puzzle, user, zorluk, posthog],
  );

  const submitPath = useCallback(
    (path: number[]) => {
      if (!puzzle || !progress || completed) {
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
      wheelAttemptRef.current += 1;
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
      const longerKutu = partialOfUnfoundLongerTarget(
        puzzle.words,
        norm,
        progress.foundWordIds,
      );
      if (longerKutu) {
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
          playHubSfx('bonus');
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
            setMessage(`Bonus: ${norm} — 10/10! B rozetinin üstündeki ödüle dokun`);
          } else {
            const { cycle, hedef } = bonusIpucuIlerleme(nextBonus.length);
            setMessage(`Bonus: ${norm} — ${cycle}/${hedef} (+1 ipucu yolunda)`);
          }
          return;
        }
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setMessage(
          norm.length <= 3
            ? 'Bonus değil — çarktaki harflerle başka kelime dene'
            : 'Geçerli bonus değil — TDK’da yok veya ızgarada',
        );
        setSelectedPath([]);
        return;
      }
      if (roundComplete) {
        setMessage('Izgara tamam — bonus kelime arayabilirsin');
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
        setSelectedPath([]);
        return;
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const foundWordIds = [...progress.foundWordIds, target.id];
      setSelectedPath([]);
      applyFoundWordIds(progress, foundWordIds, `+ ${target.kelime}`);
    },
    [applyFoundWordIds, completed, puzzle, progress, roundComplete],
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

  const onClaimBonusHint = useCallback(() => {
    if (!progress) return;
    const pending = sofraPendingBonusHintClaims(progress);
    if (pending <= 0) return;
    playHubSfx('bonus');
    const claimed = sofraBonusHintTiersClaimed(progress) + 1;
    setProgress({
      ...progress,
      bonusHintTiersClaimed: claimed,
      elapsedMs: elapsedRef.current,
    });
    setMessage('+1 ipucu kazandın! Ampüle dokun.');
  }, [progress]);

  const onHint = useCallback(async () => {
    if (!puzzle || !progress || completed) return;
    const dailyUsed = sofraDailyHintsUsed(progress);
    const claimedTiers = sofraBonusHintTiersClaimed(progress);
    if (!ipucuHakkiKaldi(dailyUsed, claimedTiers)) {
      setMessage('İpucu hakkın bitti');
      return;
    }
    const hintIndex = dailyUsed;
    if (hintIndex >= SOFRA_FREE_IPUCU) {
      if (!user?.email) {
        setMessage('Ücretli ipucu için giriş yapmalısın');
        return;
      }
      try {
        const spend = await spendGameHint({
          userEmail: user.email,
          game: 'kelime_sofrasi',
          puzzleId: puzzle.id,
          hintIndex,
        });
        if (!spend.ok) {
          setMessage('Yeterli GC yok');
          return;
        }
        posthog.capture('jeton_spent', { amount: spend.charged, spent_on: 'game' });
      } catch {
        setMessage('GastroCoin harcanamadı, tekrar dene');
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
      dailyHintsUsed: dailyUsed + 1,
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
  }, [applyFoundWordIds, completed, puzzle, progress, user?.email, posthog]);

  const claimedBonusTiers = progress ? sofraBonusHintTiersClaimed(progress) : 0;
  const pendingBonusClaims = progress ? sofraPendingBonusHintClaims(progress) : 0;
  const hintsLeft = progress
    ? sofraIpucuKalan(sofraDailyHintsUsed(progress), claimedBonusTiers)
    : 0;

  if (loadError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 17, textAlign: 'center' }}>
          Sofra acilamadi
        </Text>
        <Text style={{ color: colors.muted, fontWeight: '600', fontSize: 14, textAlign: 'center' }}>
          {loadError}
        </Text>
        <Pressable
          onPress={() => setLoadRetryTick((n) => n + 1)}
          style={{
            backgroundColor: colors.accent,
            borderRadius: 12,
            paddingHorizontal: 20,
            paddingVertical: 12,
          }}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>Tekrar dene</Text>
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.muted, fontWeight: '700' }}>Lobiye dön</Text>
        </Pressable>
      </View>
    );
  }

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
        <View style={styles.bgWrap} pointerEvents="none">
          <View style={styles.bgCoverStage}>
            <Image
              source={sofraBackgroundForPuzzle(puzzle.id)}
              style={[styles.bgImage, !bgReady ? styles.bgImageHidden : null]}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={0}
              recyclingKey={puzzle.id}
              priority="low"
            />
          </View>
        </View>

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
                disabled={completed}
              />
              <View style={styles.bonusBadgeAnchor} pointerEvents="box-none">
                <SofraBonusBadge
                  bonusFoundCount={bonusCount}
                  pendingClaims={pendingBonusClaims}
                  onClaimReward={onClaimBonusHint}
                />
              </View>
              <View style={styles.hintBadgeAnchor} pointerEvents="box-none">
                <SofraHintButton
                  hintsLeft={hintsLeft}
                  onPress={() => void onHint()}
                  disabled={completed}
                />
              </View>
            </View>
          </View>
        </View>

        {roundComplete ? (
          <View style={styles.completeBar} pointerEvents="auto">
            <Text style={styles.completeTitle}>
              {resultScore
                ? `${resultScore.score} puan · ${formatChallengeElapsed(resultElapsedRef.current || progress.elapsedMs)}`
                : 'Sofra tamam!'}
            </Text>
            {hintsLeft > 0 && claimedBonusTiers > 0 ? (
              <Text style={styles.completeSub}>
                Kalan ipucu: {hintsLeft} — ızgara bittikten sonra kullanılamaz
              </Text>
            ) : null}
            {resultScore?.detail ? (
              <Text style={styles.completeSub}>{resultScore.detail}</Text>
            ) : message ? (
              <Text style={styles.completeSub}>{message}</Text>
            ) : null}
            <View style={styles.completeActions}>
              {!sofraGunlukLimitDoldu(progress) ? (
                <Pressable
                  style={[styles.completeBtn, styles.completeBtnPrimary]}
                  onPress={() => void handleNextRound()}
                  disabled={nextRoundLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Yeni bulmaca">
                  <Text style={styles.completeBtnText}>
                    {nextRoundLoading ? 'Hazırlanıyor…' : 'Yeni bulmaca'}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                style={[
                  styles.completeBtn,
                  sofraGunlukLimitDoldu(progress)
                    ? styles.completeBtnPrimary
                    : styles.completeBtnSecondary,
                ]}
                onPress={handleExitToLobby}
                accessibilityRole="button"
                accessibilityLabel="Çıkış">
                <Text style={styles.completeBtnText}>Çıkış</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
