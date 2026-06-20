import { useFocusEffect } from '@react-navigation/native';

import { useRouter, type Href } from 'expo-router';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';



import { EglenceGameCarousel } from '@/components/eglence/EglenceGameCarousel';

import { EglenceHubHeader } from '@/components/eglence/EglenceHubHeader';

import { EglenceSectionHeader } from '@/components/eglence/EglenceSectionHeader';

import { EglenceTaskList } from '@/components/eglence/EglenceTaskList';

import { EglenceWalletCard } from '@/components/eglence/EglenceWalletCard';

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

import { GastroColors } from '@/constants/theme';

import { useCity } from '@/context/city-context';

import { useSession } from '@/context/session-context';

import { listGourmetChatRooms, getJetonWallet, claimDailyLogin } from '@/lib/api';

import { warmSofraPuzzleCache, prefetchSofraPuzzlesForToday } from '@/lib/kelime-sofrasi/puzzle-cache';

import { loadSofraMetaStatus } from '@/lib/kelime-sofrasi/storage';

import { loadGunlukKelimeMetaStatus } from '@/lib/gunluk-kelime/storage';

import { activePuzzleId } from '@/lib/mini-sudoku/schedule';

import { loadSudokuMetaStatus } from '@/lib/mini-sudoku/storage';

import type { GourmetChatRoom } from '@/lib/types';



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



export default function EglenceTabScreen() {

  const { city } = useCity();

  const router = useRouter();

  const { user } = useSession();

  const [rooms, setRooms] = useState<GourmetChatRoom[]>([]);

  const [loadingRooms, setLoadingRooms] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [roomsError, setRoomsError] = useState<string | null>(null);

  const [sudokuCompleted, setSudokuCompleted] = useState(false);

  const [sudokuInProgress, setSudokuInProgress] = useState(false);

  const [sofraCompleted, setSofraCompleted] = useState(false);

  const [sofraInProgress, setSofraInProgress] = useState(false);

  const [gunlukKelimeCompleted, setGunlukKelimeCompleted] = useState(false);

  const [gunlukKelimeInProgress, setGunlukKelimeInProgress] = useState(false);

  const [jetonBalance, setJetonBalance] = useState<number | null>(null);

  const [jetonLoading, setJetonLoading] = useState(false);

  const [jetonSheetOpen, setJetonSheetOpen] = useState(false);
  const [tasksExpanded, setTasksExpanded] = useState(true);
  const [followProgress, setFollowProgress] = useState<HubFollowProgress>({
    current: 0,
    target: HUB_FOLLOW_TARGET,
    granted: false,
  });
  const [dailyLoginGranted, setDailyLoginGranted] = useState(false);
  const [hubEarn, setHubEarn] = useState({
    reviewToday: 0,
    reviewLimit: 1,
    orderToday: 0,
    orderLimit: 2,
    referralToday: 0,
    referralLimit: 5,
  });

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

  }, [user?.email]);



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



  const loadRooms = useCallback(async (silent = false) => {

    if (!silent) setLoadingRooms(true);

    setRoomsError(null);

    try {

      const payload = await listGourmetChatRooms(city);

      setRooms(payload.items);

    } catch (err) {

      setRoomsError(err instanceof Error ? err.message : 'Odalar yüklenemedi.');

    } finally {

      setLoadingRooms(false);

      setRefreshing(false);

    }

  }, [city]);



  const refreshAll = useCallback(

    async (silent = false) => {

      await Promise.all([
        loadSudokuMeta(),
        loadSofraMeta(),
        loadGunlukKelimeMeta(),
        loadRooms(silent),
        loadJeton(),
      ]);

    },

    [loadRooms, loadSudokuMeta, loadSofraMeta, loadGunlukKelimeMeta, loadJeton],

  );



  useEffect(() => {

    void refreshAll();

  }, [refreshAll]);



  useFocusEffect(
    useCallback(() => {
      setTasksExpanded(true);
      const gunId = activePuzzleId();
      warmSofraPuzzleCache(gunId);
      prefetchSofraPuzzlesForToday(gunId, 'orta');
      void loadSudokuMeta();
      void loadSofraMeta();
      void loadGunlukKelimeMeta();
      void loadJeton();
    }, [loadSudokuMeta, loadSofraMeta, loadGunlukKelimeMeta, loadJeton]),
  );



  const gameStatus = useMemo(

    () =>

      ({

        'mini-sudoku': sudokuStatus(sudokuCompleted, sudokuInProgress),

        'kelime-yarismasi': 'oyna' as EglenceGameStatus,

        'soru-cevap': 'oyna' as EglenceGameStatus,

        'kelime-sofrasi': sofraStatus(sofraCompleted, sofraInProgress),

        'gunluk-kelime': sudokuStatus(gunlukKelimeCompleted, gunlukKelimeInProgress),

      }) satisfies Record<EglenceGameId, EglenceGameStatus>,

    [sudokuCompleted, sudokuInProgress, sofraCompleted, sofraInProgress, gunlukKelimeCompleted, gunlukKelimeInProgress],

  );

  const hubTaskStates = useMemo(
    (): Record<HubTaskId, HubTaskState> => ({
      'daily-login': dailyLoginGranted ? 'done' : 'active',
      invite: hubEarn.referralToday >= 1 ? 'done' : 'active',
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

      const room =

        rooms.find((item) => item.slug === SORU_CEVAP_ROOM_META.slug) ??

        rooms[0];

      if (!room) {

        Alert.alert('Soru-Cevap', 'Gurme odası henüz yüklenemedi. Biraz sonra tekrar dene.');

        return;

      }

      router.push({

        pathname: '/gurme/[roomSlug]',

        params: {

          roomSlug: room.slug,

          title: room.title,

          emoji: room.emoji,

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

  }



  function onTaskPress(task: HubTaskDef) {
    if (task.id === 'daily-login') {
      if (!user?.email) {
        Alert.alert('Giriş gerekli', 'Günlük giriş ödülü için Hesap sekmesinden giriş yap.');
        return;
      }
      if (dailyLoginGranted) return;
      void claimDailyLogin(user.email)
        .then((result) => {
          if (result.ok) {
            setJetonBalance(result.balance);
            setDailyLoginGranted(true);
            Alert.alert('Günlük giriş', `+${result.amount} jeton hesabına eklendi!`);
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
        Alert.alert('Davet', 'Bugünkü davet jeton tavanına ulaştın.');
        return;
      }
      setJetonSheetOpen(true);
      return;
    }

    if (task.id === 'follow') {
      if (followProgress.granted) return;
      if (followProgress.current >= followProgress.target) {
        void loadJeton().then(() => {
          Alert.alert('Tebrikler', '+10 jeton hesabına eklendi!');
        });
        return;
      }
      router.push('/(tabs)/takip' as Href);
      return;
    }

    if (task.id === 'review') {
      if (hubEarn.reviewToday >= hubEarn.reviewLimit) {
        Alert.alert('Yorum görevi', 'Bugünkü yorum jetonunu zaten aldın.');
        return;
      }
      router.push('/(tabs)/' as Href);
      return;
    }

    if (task.id === 'order') {
      if (hubEarn.orderToday >= hubEarn.orderLimit) {
        Alert.alert('Sipariş görevi', 'Bugünkü sipariş jeton tavanına ulaştın.');
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
      `${product.title} — sunucu bağlantısı çok yakında.\n\nFiyat: ${product.cost} jeton (onaylandı, henüz düşülmüyor).`,
    );
  }

  return (

    <Screen

      refreshing={refreshing}

      onRefresh={() => {

        setRefreshing(true);

        void refreshAll(true);

      }}>

      <EglenceHubHeader

        jetonBalance={jetonBalance}

        jetonLoading={jetonLoading}

        onJetonPress={() => setJetonSheetOpen(true)}

      />

      <JetonEarnSheet

        visible={jetonSheetOpen}

        balance={jetonBalance}

        onClose={() => setJetonSheetOpen(false)}

      />



      <View style={styles.hubStack}>

        <EglenceWalletCard

          balance={jetonBalance}

          loading={jetonLoading}

          onPress={() => setJetonSheetOpen(true)}

        />

        <EglenceGameCarousel gameStatus={gameStatus} onPlay={openGame} />

        <EglenceTaskList
          taskStates={hubTaskStates}
          followProgress={followProgress}
          dailyLoginGranted={dailyLoginGranted}
          expanded={tasksExpanded}
          onToggle={() => setTasksExpanded((prev) => !prev)}
          onTaskPress={onTaskPress}
        />

        <GastroMarketSection
          jetonBalance={jetonBalance}
          isLoggedIn={Boolean(user?.email)}
          onPurchase={onGamePlayPurchase}
        />

      </View>



      <EglenceSectionHeader

        title="Gurme Sohbetler"

        tone="chat"

        hint="Şehre özel odalarda sohbet et"

        style={styles.sectionGap}

      />

      {!user?.email ? (

        <View style={styles.guestCard}>

          <Text style={styles.guestText}>Sohbete yazmak için Hesap sekmesinden giriş yap.</Text>

        </View>

      ) : null}



      {loadingRooms ? (

        <ActivityIndicator color={GastroColors.accent} style={{ marginTop: 16 }} />

      ) : roomsError ? (

        <Text style={styles.error}>{roomsError}</Text>

      ) : (

        <View style={styles.list}>

          {rooms.map((room) => (

            <Pressable

              key={room.slug}

              style={({ pressed }) => [styles.roomCard, pressed && { opacity: 0.92 }]}

              onPress={() =>

                router.push({

                  pathname: '/gurme/[roomSlug]',

                  params: {

                    roomSlug: room.slug,

                    title: room.title,

                    emoji: room.emoji,

                  },

                })

              }>

              <View style={styles.roomTop}>

                <Text style={styles.roomEmoji}>{room.emoji}</Text>

                <View style={styles.roomMeta}>

                  <Text style={styles.roomTitle}>{room.title}</Text>

                  <Text style={styles.roomDesc}>{room.description}</Text>

                </View>

              </View>

              <Text style={styles.roomCount}>

                {room.message_count > 0 ? `${room.message_count} mesaj` : 'Sohbeti başlat'}

              </Text>

            </Pressable>

          ))}

        </View>

      )}

    </Screen>

  );

}



const styles = StyleSheet.create({

  hubStack: { gap: 16, marginTop: 12 },

  sectionGap: { marginTop: 24 },

  guestCard: {

    marginTop: 10,

    borderRadius: 14,

    borderWidth: 1,

    borderColor: 'rgba(66, 133, 244, 0.28)',

    backgroundColor: GastroColors.panel,

    padding: 14,

  },

  guestText: { color: GastroColors.muted, fontSize: 13, lineHeight: 18 },

  list: { gap: 10, marginTop: 10 },

  roomCard: {

    gap: 10,

    borderRadius: 14,

    borderWidth: 1,

    borderColor: 'rgba(66, 133, 244, 0.22)',

    borderLeftWidth: 3,

    borderLeftColor: GastroColors.sky,

    backgroundColor: GastroColors.panel,

    padding: 14,

  },

  roomTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },

  roomEmoji: { fontSize: 28, marginTop: 2 },

  roomMeta: { flex: 1, gap: 4 },

  roomTitle: { color: GastroColors.text, fontSize: 17, fontWeight: '800' },

  roomDesc: { color: GastroColors.muted, fontSize: 13, lineHeight: 18 },

  roomCount: { color: GastroColors.gold, fontSize: 12, fontWeight: '700' },

  error: { color: GastroColors.bad, lineHeight: 20, marginTop: 12 },

});


