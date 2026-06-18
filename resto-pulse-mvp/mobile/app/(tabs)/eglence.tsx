import { useFocusEffect } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { EglenceGameCard } from '@/components/eglence/EglenceGameCard';
import { EglenceSectionHeader } from '@/components/eglence/EglenceSectionHeader';
import { EglenceTabHeader } from '@/components/eglence/EglenceTabHeader';
import { Screen } from '@/components/ui/Screen';
import {
  EGLENCE_GAMES,
  SORU_CEVAP_ROOM_META,
  type EglenceGameId,
  type EglenceGameStatus,
} from '@/constants/eglence-games';
import { GastroColors } from '@/constants/theme';
import { useCity } from '@/context/city-context';
import { useSession } from '@/context/session-context';
import { listGourmetChatRooms } from '@/lib/api';
import { buildDailySofraPuzzle, todaySofraPuzzleId } from '@/lib/kelime-sofrasi/puzzle';
import { loadSofraProgress } from '@/lib/kelime-sofrasi/storage';
import { buildDailyPuzzle, todayPuzzleId } from '@/lib/mini-sudoku/puzzle';
import { loadProgress } from '@/lib/mini-sudoku/storage';
import type { GourmetChatRoom } from '@/lib/types';

function sudokuStatus(completed: boolean, inProgress: boolean): EglenceGameStatus {
  if (completed) return 'tamamlandi';
  if (inProgress) return 'devam';
  return 'oyna';
}

export default function EglenceTabScreen() {
  const { city, cityLabel } = useCity();
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

  const loadSudokuMeta = useCallback(async () => {
    const puzzle = buildDailyPuzzle(todayPuzzleId());
    const progress = await loadProgress(puzzle);
    setSudokuCompleted(progress.completedAt != null);
    const started =
      progress.completedAt == null &&
      progress.values.some((row, ri) =>
        row.some((cell, ci) => cell !== puzzle.givens[ri]![ci]!),
      );
    setSudokuInProgress(started);
  }, []);

  const loadSofraMeta = useCallback(async () => {
    const puzzle = buildDailySofraPuzzle(todaySofraPuzzleId());
    const progress = await loadSofraProgress(puzzle);
    setSofraCompleted(progress.completedAt != null);
    setSofraInProgress(progress.completedAt == null && progress.foundWordIds.length > 0);
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
      await Promise.all([loadSudokuMeta(), loadSofraMeta(), loadRooms(silent)]);
    },
    [loadRooms, loadSudokuMeta, loadSofraMeta],
  );

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useFocusEffect(
    useCallback(() => {
      void loadSudokuMeta();
      void loadSofraMeta();
    }, [loadSudokuMeta, loadSofraMeta]),
  );

  const gameStatus = useMemo(
    () =>
      ({
        'mini-sudoku': sudokuStatus(sudokuCompleted, sudokuInProgress),
        'kelime-yarismasi': 'oyna' as EglenceGameStatus,
        'soru-cevap': 'oyna' as EglenceGameStatus,
        'kelime-sofrasi': sudokuStatus(sofraCompleted, sofraInProgress),
      }) satisfies Record<EglenceGameId, EglenceGameStatus>,
    [sudokuCompleted, sudokuInProgress, sofraCompleted, sofraInProgress],
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
      router.push('/oyun/kelime-sofrasi' as Href);
      return;
    }
  }

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void refreshAll(true);
      }}>
      <EglenceTabHeader cityLabel={cityLabel} />

      <EglenceSectionHeader title="Bugün" tone="games" hint="Günlük bulmaca ve yarışmalar" />
      <View style={styles.gameList}>
        {EGLENCE_GAMES.map((game) => (
          <EglenceGameCard
            key={game.id}
            gameId={game.id}
            title={game.title}
            subtitle={game.subtitle}
            icon={game.icon}
            status={gameStatus[game.id]}
            disabled={!game.available}
            onPress={() => openGame(game.id)}
          />
        ))}
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
  sectionGap: { marginTop: 20 },
  gameList: { gap: 10, marginTop: 10 },
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
