import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { EglenceChallengeShareButton } from '@/components/eglence/EglenceFriendLeaderboard';
import { useSession } from '@/context/session-context';
import { formatChallengeElapsed, type EglenceChallengeGame } from '@/lib/eglence-challenge-share';
import { getEglenceLeaderboard } from '@/lib/api';
import type { EglenceLeaderboardEntry } from '@/lib/types';

type Props = {
  visible: boolean;
  onClose: () => void;
  game: EglenceChallengeGame;
  periodKey: string;
  elapsedMs?: number;
  score?: number;
};

const TABS = [
  { id: 'friends' as const, label: 'Arkadaşlar' },
  { id: 'global' as const, label: 'Herkes' },
];

function formatValue(game: EglenceChallengeGame, entry: EglenceLeaderboardEntry): string {
  if ((game === 'mini_sudoku' || game === 'kelime_sofrasi') && entry.elapsed_ms != null) {
    return formatChallengeElapsed(entry.elapsed_ms);
  }
  if (entry.score != null) {
    return `${entry.score}`;
  }
  return '—';
}

function displayName(entry: EglenceLeaderboardEntry): string {
  const raw = entry.user.nickname?.trim() || 'Gurme';
  return raw.replace(/^@/, '').toLocaleUpperCase('tr-TR');
}

function LeaderboardPage({
  game,
  items,
  loading,
  emptyHint,
}: {
  game: EglenceChallengeGame;
  items: EglenceLeaderboardEntry[];
  loading: boolean;
  emptyHint: string;
}) {
  if (loading) {
    return (
      <View style={pageStyles.center}>
        <ActivityIndicator color="#FF6B00" size="large" />
      </View>
    );
  }
  if (items.length === 0) {
    return (
      <View style={pageStyles.center}>
        <Text style={pageStyles.empty}>{emptyHint}</Text>
      </View>
    );
  }
  return (
    <ScrollView
      style={pageStyles.list}
      contentContainerStyle={pageStyles.listContent}
      showsVerticalScrollIndicator={false}>
      {items.map((entry) => (
        <View key={entry.user.id} style={[pageStyles.row, entry.is_me && pageStyles.rowMe]}>
          <Text style={[pageStyles.name, entry.is_me && pageStyles.nameMe]} numberOfLines={1}>
            {displayName(entry)}
            {entry.is_me ? ' · SEN' : ''}
          </Text>
          <Text style={[pageStyles.value, entry.is_me && pageStyles.valueMe]}>
            {formatValue(game, entry)}
            {game === 'kelime_yarismasi' && entry.score != null ? ' puan' : ''}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const pageStyles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  empty: { color: '#666', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  list: { flex: 1 },
  listContent: { paddingVertical: 8, gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  rowMe: {
    backgroundColor: '#FFF4EB',
    marginHorizontal: -8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  name: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: 0.3,
  },
  nameMe: { color: '#CC5500' },
  value: { fontSize: 22, fontWeight: '800', color: '#333', fontVariant: ['tabular-nums'] },
  valueMe: { color: '#CC5500' },
});

export function EglenceResultModal({
  visible,
  onClose,
  game,
  periodKey,
  elapsedMs,
  score,
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const { user } = useSession();
  const pagerRef = useRef<ScrollView>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [friends, setFriends] = useState<EglenceLeaderboardEntry[]>([]);
  const [globalItems, setGlobalItems] = useState<EglenceLeaderboardEntry[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingGlobal, setLoadingGlobal] = useState(false);

  const cardWidth = Math.min(screenWidth - 40, 400);
  const pageWidth = cardWidth - 32;

  const headline = useMemo(() => {
    if ((game === 'mini_sudoku' || game === 'kelime_sofrasi') && elapsedMs != null) {
      return `Süren: ${formatChallengeElapsed(elapsedMs)}`;
    }
    if (score != null) {
      return `${score} puan`;
    }
    return 'Harika iş!';
  }, [elapsedMs, game, score]);

  const loadBoards = useCallback(() => {
    if (!user?.email || !visible) return;
    setLoadingFriends(true);
    setLoadingGlobal(true);
    void getEglenceLeaderboard(user.email, game, periodKey, 'friends')
      .then((data) => setFriends(data.items))
      .catch(() => setFriends([]))
      .finally(() => setLoadingFriends(false));
    void getEglenceLeaderboard(user.email, game, periodKey, 'global')
      .then((data) => setGlobalItems(data.items))
      .catch(() => setGlobalItems([]))
      .finally(() => setLoadingGlobal(false));
  }, [game, periodKey, user?.email, visible]);

  useEffect(() => {
    if (visible) {
      setActiveTab(0);
      pagerRef.current?.scrollTo({ x: 0, animated: false });
      loadBoards();
    }
  }, [loadBoards, visible]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.72)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        },
        card: {
          width: cardWidth,
          maxHeight: '82%',
          minHeight: 420,
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: 16,
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
          elevation: 12,
        },
        close: {
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 2,
          width: 36,
          height: 36,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 18,
          backgroundColor: '#F0F0F0',
        },
        kicker: {
          color: '#888',
          fontSize: 12,
          fontWeight: '700',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          textAlign: 'center',
          marginTop: 8,
        },
        title: {
          color: '#111',
          fontSize: 26,
          fontWeight: '900',
          textAlign: 'center',
          marginTop: 4,
        },
        sub: {
          color: '#666',
          fontSize: 13,
          textAlign: 'center',
          marginTop: 6,
          marginBottom: 12,
          lineHeight: 18,
        },
        tabs: {
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 10,
        },
        tab: {
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 999,
          backgroundColor: '#F3F3F3',
        },
        tabOn: { backgroundColor: '#FF6B00' },
        tabText: { color: '#666', fontWeight: '700', fontSize: 13 },
        tabTextOn: { color: '#fff' },
        dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 8 },
        dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#DDD' },
        dotOn: { backgroundColor: '#FF6B00', width: 18 },
        pagerWrap: { flex: 1, minHeight: 200 },
        swipeHint: {
          textAlign: 'center',
          color: '#AAA',
          fontSize: 11,
          marginBottom: 6,
        },
        shareWrap: { marginTop: 12, paddingTop: 4 },
      }),
    [cardWidth],
  );

  const goTab = (index: number) => {
    setActiveTab(index);
    pagerRef.current?.scrollTo({ x: index * pageWidth, animated: true });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Pressable style={styles.close} onPress={onClose} accessibilityLabel="Kapat" hitSlop={8}>
            <Ionicons name="close" size={22} color="#333" />
          </Pressable>

          <Text style={styles.kicker}>
            {game === 'mini_sudoku'
              ? 'Sudoku'
              : game === 'kelime_sofrasi'
                ? 'Kelime Sofrası'
                : 'Kelime Yarışması'}
          </Text>
          <Text style={styles.title}>Tebrikler!</Text>
          <Text style={styles.sub}>{headline}</Text>

          <View style={styles.tabs}>
            {TABS.map((tab, index) => (
              <Pressable
                key={tab.id}
                style={[styles.tab, activeTab === index && styles.tabOn]}
                onPress={() => goTab(index)}>
                <Text style={[styles.tabText, activeTab === index && styles.tabTextOn]}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.swipeHint}>Yana kaydır · sıralamayı değiştir</Text>
          <View style={styles.dots}>
            {TABS.map((tab, index) => (
              <View key={tab.id} style={[styles.dot, activeTab === index && styles.dotOn]} />
            ))}
          </View>

          <View style={styles.pagerWrap}>
            <ScrollView
              ref={pagerRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              onMomentumScrollEnd={(event) => {
                const page = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
                setActiveTab(page);
              }}>
              <View style={{ width: pageWidth, flex: 1 }}>
                <LeaderboardPage
                  game={game}
                  items={friends}
                  loading={loadingFriends}
                  emptyHint="Henüz arkadaş skoru yok. Paylaş ile challenge gönder!"
                />
              </View>
              <View style={{ width: pageWidth, flex: 1 }}>
                <LeaderboardPage
                  game={game}
                  items={globalItems}
                  loading={loadingGlobal}
                  emptyHint="Bu dönemde henüz kimse oynamamış."
                />
              </View>
            </ScrollView>
          </View>

          <View style={styles.shareWrap}>
            <EglenceChallengeShareButton game={game} elapsedMs={elapsedMs} score={score} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
