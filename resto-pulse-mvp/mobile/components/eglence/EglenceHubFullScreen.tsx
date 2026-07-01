import { useFocusEffect } from '@react-navigation/native';

import { useRouter, type Href } from 'expo-router';

import { useGastroPostHog } from '@/lib/gastro-posthog';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Alert, InteractionManager, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { EglenceGameCarousel } from '@/components/eglence/EglenceGameCarousel';

import { EglenceHubHeader } from '@/components/eglence/EglenceHubHeader';

import { EglenceTaskList } from '@/components/eglence/EglenceTaskList';

import { EglenceWalletCard } from '@/components/eglence/EglenceWalletCard';

import { GastroCoinRewardBurstModal } from '@/components/eglence/GastroCoinRewardBurst';

import { GastroMarketSection } from '@/components/eglence/GastroMarketSection';

import { JetonEarnSheet } from '@/components/eglence/JetonEarnSheet';

import { Screen } from '@/components/ui/Screen';

import {
  EGLENCE_GUNLUK_TEK_OYUN,
  SORU_CEVAP_ROOM_META,
  type EglenceGameId,
  type EglenceGameStatus,
} from '@/constants/eglence-games';

import {
  HUB_FOLLOW_TARGET,
  type HubFollowProgress,
  type HubGamePlayProduct,
  type HubTaskDef,
  type HubTaskId,
  type HubTaskState,
} from '@/constants/eglence-hub';

import { GASTROCOIN_SHORT } from '@/constants/gastrocoin-theme';

import { useSession } from '@/context/session-context';
import { useGastroTheme } from '@/context/theme-context';

import { claimDailyLogin, getJetonWallet } from '@/lib/api';
import { playHubSfx } from '@/lib/gastro-hub-sfx';
import { warmHubSfxPreference } from '@/lib/hub-sfx-preference';

import { prefetchSofraPuzzlesForToday } from '@/lib/kelime-sofrasi/puzzle-cache';

import { loadSofraMetaStatus } from '@/lib/kelime-sofrasi/storage';

import { loadGunlukKelimeMetaStatus } from '@/lib/gunluk-kelime/storage';
import { loadKelimeBulLobbyMeta } from '@/lib/kelime-bul/storage';

import { activePuzzleId } from '@/lib/mini-sudoku/schedule';

import { loadSudokuMetaStatus } from '@/lib/mini-sudoku/storage';

function sudokuStatus(completed: boolean, inProgress: boolean): EglenceGameStatus {
  if (completed && EGLENCE_GUNLUK_TEK_OYUN) return 'tamamlandi';
  if (inProgress) return 'devam';
  return 'oyna';
}

function sofraStatus(completed: boolean, inProgress: boolean): EglenceGameStatus {
  if (completed) return 'tamamlandi';
  if (inProgress) return 'devam';
  return 'oyna';
}

function kelimeBulStatus(completed: boolean, inProgress: boolean): EglenceGameStatus {
  if (completed) return 'tamamlandi';
  if (inProgress) return 'devam';
  return 'oyna';
}

/** Hub geri ekleme: 1=carousel · 2=görevler · 3=jeton · 4=cüzdan · 5=GC animasyon + oyun meta */
export type EglenceHubBisectStep = 1 | 2 | 3 | 4 | 5;

type Props = {
  bisectStep?: EglenceHubBisectStep;
};

export default function EglenceHubFullScreen({ bisectStep = 5 }: Props) {
  const posthog = useGastroPostHog();
  const router = useRouter();
  const { user } = useSession();
  const { colors } = useGastroTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [sudokuCompleted, setSudokuCompleted] = useState(false);
  const [sudokuInProgress, setSudokuInProgress] = useState(false);
  const [sofraCompleted, setSofraCompleted] = useState(false);
  const [sofraInProgress, setSofraInProgress] = useState(false);
  const [gunlukKelimeCompleted, setGunlukKelimeCompleted] = useState(false);
  const [gunlukKelimeInProgress, setGunlukKelimeInProgress] = useState(false);
  const [kelimeBulCompleted, setKelimeBulCompleted] = useState(false);
  const [kelimeBulInProgress, setKelimeBulInProgress] = useState(false);
  const [jetonBalance, setJetonBalance] = useState<number | null>(null);
  const [jetonLoading, setJetonLoading] = useState(false);
  const [jetonSheetOpen, setJetonSheetOpen] = useState(false);
  const [jetonSheetInviteFocus, setJetonSheetInviteFocus] = useState(false);
  const [tasksExpanded, setTasksExpanded] = useState(true);
  const [followProgress, setFollowProgress] = useState<HubFollowProgress>({
    current: 0,
    target: HUB_FOLLOW_TARGET,
    granted: false,
  });
  const [dailyLoginGranted, setDailyLoginGranted] = useState(false);
  const [rewardBurstOrigin, setRewardBurstOrigin] = useState<{ x: number; y: number } | null>(null);
  const pendingRewardAlert = useRef<{ title: string; message: string } | null>(null);
  const [hubEarn, setHubEarn] = useState({
    reviewToday: 0,
    reviewLimit: 1,
    orderToday: 0,
    orderLimit: 2,
    referralToday: 0,
    referralLimit: 5,
  });

  const showCarousel = bisectStep >= 1;
  const showTasks = bisectStep >= 2;
  const showJeton = bisectStep >= 3;
  const showWallet = bisectStep >= 4;
  const showWalletCoin = bisectStep >= 5;
  const showMarket = bisectStep >= 5;
  const loadGameMeta = bisectStep >= 5;
  const needsJetonApi = showTasks || showJeton || showWallet;

  const loadJeton = useCallback(async () => {
    if (!user?.email) {
      setJetonBalance(null);
      setFollowProgress({ current: 0, target: HUB_FOLLOW_TARGET, granted: false });
      setDailyLoginGranted(false);
      return;
    }

    setJetonLoading(true);

    try {
      const wallet = await getJetonWallet(user.email);
      setJetonBalance(wallet.balance);
      setFollowProgress({
        current: wallet.follow_today_count ?? 0,
        target: wallet.follow_bundle_threshold ?? HUB_FOLLOW_TARGET,
        granted: wallet.follow_bundle_granted_today ?? false,
      });
      setDailyLoginGranted(wallet.daily_login_granted_today ?? false);
      setHubEarn({
        reviewToday: wallet.review_earn_today ?? 0,
        reviewLimit: wallet.review_daily_limit ?? 1,
        orderToday: wallet.order_earn_today ?? 0,
        orderLimit: wallet.order_daily_limit ?? 2,
        referralToday: wallet.referral_earn_today ?? 0,
        referralLimit: wallet.referral_daily_limit ?? 5,
      });

      let taskCountAvailable = 0;
      if (!wallet.daily_login_granted_today) taskCountAvailable += 1;
      if ((wallet.referral_earn_today ?? 0) < (wallet.referral_daily_limit ?? 5)) taskCountAvailable += 1;
      if (!wallet.follow_bundle_granted_today) taskCountAvailable += 1;
      if ((wallet.review_earn_today ?? 0) < (wallet.review_daily_limit ?? 1)) taskCountAvailable += 1;
      if ((wallet.order_earn_today ?? 0) < (wallet.order_daily_limit ?? 2)) taskCountAvailable += 1;
      posthog.capture('daily_task_viewed', { task_count_available: taskCountAvailable });
    } catch {
      setJetonBalance(null);
      setFollowProgress({ current: 0, target: HUB_FOLLOW_TARGET, granted: false });
      setDailyLoginGranted(false);
      setHubEarn({
        reviewToday: 0,
        reviewLimit: 1,
        orderToday: 0,
        orderLimit: 2,
        referralToday: 0,
        referralLimit: 5,
      });
    } finally {
      setJetonLoading(false);
    }
  }, [user?.email, posthog]);

  const loadSudokuMeta = useCallback(async () => {
    const puzzleId = activePuzzleId();
    const status = await loadSudokuMetaStatus(puzzleId);
    setSudokuCompleted(status.completed);
    setSudokuInProgress(status.inProgress);
  }, []);

  const loadSofraMeta = useCallback(async () => {
    const gunId = activePuzzleId();
    const zorluklar = ['kolay', 'orta', 'zor'] as const;
    const statuses = await Promise.all(zorluklar.map((z) => loadSofraMetaStatus(gunId, z)));
    setSofraCompleted(statuses.every((s) => s.completed));
    setSofraInProgress(statuses.some((s) => s.inProgress));
  }, []);

  const loadGunlukKelimeMeta = useCallback(async () => {
    const puzzleId = activePuzzleId();
    const status = await loadGunlukKelimeMetaStatus(puzzleId);
    setGunlukKelimeCompleted(status.completed);
    setGunlukKelimeInProgress(status.inProgress);
  }, []);

  const loadKelimeBulMeta = useCallback(async () => {
    const meta = await loadKelimeBulLobbyMeta();
    setKelimeBulCompleted(meta.completed);
    setKelimeBulInProgress(meta.inProgress);
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      const jobs: Promise<void>[] = [];
      if (loadGameMeta) {
        jobs.push(loadSudokuMeta(), loadSofraMeta(), loadGunlukKelimeMeta(), loadKelimeBulMeta());
      }
      if (needsJetonApi) jobs.push(loadJeton());
      await Promise.all(jobs);
    } finally {
      setRefreshing(false);
    }
  }, [loadSudokuMeta, loadSofraMeta, loadGunlukKelimeMeta, loadKelimeBulMeta, loadJeton, loadGameMeta, needsJetonApi]);

  useFocusEffect(
    useCallback(() => {
      void warmHubSfxPreference();
      if (showTasks) setTasksExpanded(true);

      let jetonTask: { cancel?: () => void } | null = null;

      if (loadGameMeta) {
        void loadSudokuMeta();
        void loadSofraMeta();
        void loadGunlukKelimeMeta();
        void loadKelimeBulMeta();
      }

      if (needsJetonApi) {
        jetonTask = InteractionManager.runAfterInteractions(() => {
          void loadJeton();
        });
      }

      return () => {
        jetonTask?.cancel?.();
      };
    }, [
      loadSudokuMeta,
      loadSofraMeta,
      loadGunlukKelimeMeta,
      loadKelimeBulMeta,
      loadJeton,
      loadGameMeta,
      needsJetonApi,
      showTasks,
    ]),
  );

  const staticGameStatus = useMemo(
    () =>
      ({
        'mini-sudoku': 'oyna',
        'kelime-yarismasi': 'oyna',
        'soru-cevap': 'oyna',
        'kelime-sofrasi': 'oyna',
        'gunluk-kelime': 'oyna',
        'kelime-bul': 'oyna',
      }) satisfies Record<EglenceGameId, EglenceGameStatus>,
    [],
  );

  const gameStatus = useMemo(
    () =>
      loadGameMeta
        ? ({
            'mini-sudoku': sudokuStatus(sudokuCompleted, sudokuInProgress),
            'kelime-yarismasi': 'oyna' as EglenceGameStatus,
            'soru-cevap': 'oyna' as EglenceGameStatus,
            'kelime-sofrasi': sofraStatus(sofraCompleted, sofraInProgress),
            'gunluk-kelime': sudokuStatus(gunlukKelimeCompleted, gunlukKelimeInProgress),
            'kelime-bul': kelimeBulStatus(kelimeBulCompleted, kelimeBulInProgress),
          } satisfies Record<EglenceGameId, EglenceGameStatus>)
        : staticGameStatus,
    [
      loadGameMeta,
      staticGameStatus,
      sudokuCompleted,
      sudokuInProgress,
      sofraCompleted,
      sofraInProgress,
      gunlukKelimeCompleted,
      gunlukKelimeInProgress,
      kelimeBulCompleted,
      kelimeBulInProgress,
    ],
  );

  const hubTaskStates = useMemo(
    (): Record<HubTaskId, HubTaskState> => ({
      'daily-login': dailyLoginGranted ? 'done' : 'active',
      invite: hubEarn.referralToday >= hubEarn.referralLimit ? 'done' : 'active',
      follow: followProgress.granted
        ? 'done'
        : followProgress.current > 0
          ? 'active'
          : 'idle',
      review: hubEarn.reviewToday >= hubEarn.reviewLimit ? 'done' : 'active',
      order:
        hubEarn.orderToday >= hubEarn.orderLimit
          ? 'done'
          : hubEarn.orderToday > 0
            ? 'active'
            : 'idle',
    }),
    [dailyLoginGranted, followProgress, hubEarn],
  );

  function openGame(id: EglenceGameId) {
    if (id === 'mini-sudoku') {
      router.push('/oyun/mini-sudoku');
      return;
    }

    if (id === 'kelime-yarismasi') {
      router.push('/oyun/kelime-yarismasi');
      return;
    }

    if (id === 'soru-cevap') {
      router.push({
        pathname: '/gurme/[roomSlug]',
        params: {
          roomSlug: SORU_CEVAP_ROOM_META.slug,
          title: SORU_CEVAP_ROOM_META.title,
          emoji: SORU_CEVAP_ROOM_META.emoji,
        },
      });
      return;
    }

    if (id === 'kelime-sofrasi') {
      prefetchSofraPuzzlesForToday(activePuzzleId(), 'orta');
      router.push('/oyun/kelime-sofrasi' as Href);
      return;
    }

    if (id === 'gunluk-kelime') {
      router.push('/oyun/gunluk-kelime' as Href);
      return;
    }

    if (id === 'kelime-bul') {
      router.push('/oyun/kelime-bul' as Href);
    }
  }

  function showRewardAlert(title: string, message: string, anchor?: { x: number; y: number }) {
    if (anchor) {
      pendingRewardAlert.current = { title, message };
      setRewardBurstOrigin(anchor);
      return;
    }
    Alert.alert(title, message);
  }

  function onRewardBurstComplete() {
    setRewardBurstOrigin(null);
    const pending = pendingRewardAlert.current;
    pendingRewardAlert.current = null;
    if (pending) {
      requestAnimationFrame(() => Alert.alert(pending.title, pending.message));
    }
  }

  function onTaskPress(task: HubTaskDef, anchor?: { x: number; y: number }) {
    if (task.id === 'daily-login') {
      if (!user?.email) {
        Alert.alert(
          'Giriş gerekli',
          'Günlük giriş ödülü için önce giriş yapmalısın.\n\nExpo Go: Hesap → Geliştirici girişi\nTestFlight/Play: Google ile giriş',
          [
            { text: 'Tamam', style: 'cancel' },
            { text: 'Hesaba git', onPress: () => router.push('/(tabs)/profil' as Href) },
          ],
        );
        return;
      }
      if (dailyLoginGranted) return;
      void claimDailyLogin(user.email)
        .then((result) => {
          if (result.ok) {
            playHubSfx('coin');
            setJetonBalance(result.balance);
            setDailyLoginGranted(true);
            posthog.capture('daily_task_completed', {
              task_id: 'daily-login',
              jeton_earned: result.amount,
            });
            posthog.capture('jeton_earned', { amount: result.amount, source: 'task' });
            showRewardAlert(
              'Günlük giriş',
              `+${result.amount} ${GASTROCOIN_SHORT} hesabına eklendi!`,
              anchor,
            );
            return;
          }
          Alert.alert('Günlük giriş', 'Bugünkü ödülü zaten aldın.');
        })
        .catch((err) => {
          Alert.alert(
            'Günlük giriş',
            err instanceof Error ? err.message : 'Ödül alınamadı. Biraz sonra tekrar dene.',
          );
        });
      return;
    }

    if (task.id === 'invite') {
      if (hubEarn.referralToday >= hubEarn.referralLimit) {
        Alert.alert('Davet', `Bugünkü davet ${GASTROCOIN_SHORT} tavanına ulaştın.`);
        return;
      }
      if (!showJeton) {
        Alert.alert('Davet', 'Jeton kazanma ekranı bir sonraki güncellemede.');
        return;
      }
      setJetonSheetInviteFocus(true);
      setJetonSheetOpen(true);
      return;
    }

    if (task.id === 'follow') {
      if (followProgress.granted) return;
      if (followProgress.current >= followProgress.target) {
        void loadJeton().then(() => {
          playHubSfx('coin');
          posthog.capture('daily_task_completed', { task_id: 'follow', jeton_earned: 10 });
          posthog.capture('jeton_earned', { amount: 10, source: 'task' });
          showRewardAlert('Tebrikler', `+10 ${GASTROCOIN_SHORT} hesabına eklendi!`, anchor);
        });
        return;
      }
      router.push('/(tabs)/takip' as Href);
      return;
    }

    if (task.id === 'review') {
      if (hubEarn.reviewToday >= hubEarn.reviewLimit) {
        Alert.alert(
          'Yorum görevi',
          `Bugünkü yorum ödülün (+5 ${GASTROCOIN_SHORT}) hesabına işlendi.`,
        );
        return;
      }
      router.push('/(tabs)/' as Href);
      return;
    }

    if (task.id === 'order') {
      if (hubEarn.orderToday >= hubEarn.orderLimit) {
        Alert.alert('Sipariş görevi', `Bugünkü sipariş ${GASTROCOIN_SHORT} tavanına ulaştın.`);
        return;
      }
      router.push('/(tabs)/' as Href);
      return;
    }

    router.push('/(tabs)/' as Href);
  }

  function onGamePlayPurchase(product: HubGamePlayProduct) {
    Alert.alert(
      'Gastro-Market',
      `${product.title} — sunucu bağlantısı çok yakında.\n\nFiyat: ${product.cost} ${GASTROCOIN_SHORT} (onaylandı, henüz düşülmüyor).`,
    );
  }

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={
        bisectStep >= 5
          ? () => {
              setRefreshing(true);
              void refreshAll();
            }
          : undefined
      }>
      {showJeton ? (
        <EglenceHubHeader
          jetonBalance={jetonBalance}
          jetonLoading={jetonLoading}
          onJetonPress={() => {
            setJetonSheetInviteFocus(false);
            setJetonSheetOpen(true);
          }}
        />
      ) : (
        <View style={styles.simpleHeader}>
          <View style={styles.titleRow}>
            <Ionicons name="game-controller" size={22} color={colors.accent} />
            <Text style={[styles.simpleTitle, { color: colors.text }]}>Eğlence & Oyun</Text>
          </View>
          {bisectStep < 5 ? (
            <Text style={[styles.bisectHint, { color: colors.muted }]}>
              Hub adım {bisectStep}/5
            </Text>
          ) : null}
        </View>
      )}

      {showJeton ? (
        <JetonEarnSheet
          visible={jetonSheetOpen}
          balance={jetonBalance}
          inviteFocus={jetonSheetInviteFocus}
          referrerId={user?.id}
          onClose={() => {
            setJetonSheetOpen(false);
            setJetonSheetInviteFocus(false);
          }}
        />
      ) : null}

      <View style={styles.hubStack}>
        {showWallet ? (
          <EglenceWalletCard
            balance={jetonBalance}
            loading={jetonLoading}
            animateCoin={showWalletCoin}
            onPress={
              showJeton
                ? () => {
                    setJetonSheetInviteFocus(false);
                    setJetonSheetOpen(true);
                  }
                : undefined
            }
          />
        ) : null}

        {showCarousel ? <EglenceGameCarousel gameStatus={gameStatus} onPlay={openGame} /> : null}

        {showTasks ? (
          <EglenceTaskList
            taskStates={hubTaskStates}
            followProgress={followProgress}
            dailyLoginGranted={dailyLoginGranted}
            expanded={tasksExpanded}
            onToggle={() => setTasksExpanded((prev) => !prev)}
            onTaskPress={onTaskPress}
          />
        ) : null}

        {showMarket ? (
          <GastroMarketSection
            jetonBalance={jetonBalance}
            isLoggedIn={Boolean(user?.email)}
            onPurchase={onGamePlayPurchase}
          />
        ) : null}
      </View>

      {showTasks ? (
        <GastroCoinRewardBurstModal origin={rewardBurstOrigin} onComplete={onRewardBurstComplete} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hubStack: { gap: 16, marginTop: 12 },
  simpleHeader: { gap: 4, marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  simpleTitle: { fontSize: 22, fontWeight: '800' },
  bisectHint: { fontSize: 12, fontWeight: '600' },
});
