import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { eglenceLobbyTheme } from '@/components/eglence/EglenceGameLobbyScreen';
import { useSession } from '@/context/session-context';
import { formatChallengeElapsed, type EglenceChallengeGame } from '@/lib/eglence-challenge-share';
import { getEglenceLeaderboard } from '@/lib/api';
import type { EglenceLeaderboardEntry } from '@/lib/types';

type Props = {
  game: EglenceChallengeGame;
  periodKey: string;
  gameId?: Parameters<typeof eglenceLobbyTheme>[0];
  title?: string;
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
    return `${entry.score} puan`;
  }
  return '—';
}

function displayName(entry: EglenceLeaderboardEntry): string {
  const raw = entry.user.nickname?.trim() || 'Gurme';
  return raw.replace(/^@/, '');
}

export function EglenceCollapsibleLeaderboard({
  game,
  periodKey,
  gameId = 'kelime-sofrasi',
  title = 'Puan tablosu',
}: Props) {
  const t = eglenceLobbyTheme(gameId);
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'global'>('friends');
  const [friends, setFriends] = useState<EglenceLeaderboardEntry[]>([]);
  const [globalItems, setGlobalItems] = useState<EglenceLeaderboardEntry[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadBoards = useCallback(() => {
    if (!user?.email) return;
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
    setLoaded(true);
  }, [game, periodKey, user?.email]);

  useEffect(() => {
    if (open && !loaded) loadBoards();
  }, [loadBoards, loaded, open]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          backgroundColor: t.panel,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: t.border,
          overflow: 'hidden',
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 14,
          gap: 8,
        },
        headerTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: t.text },
        headerHint: { fontSize: 12, color: t.muted, marginTop: 2 },
        body: { paddingHorizontal: 16, paddingBottom: 14, gap: 10 },
        tabs: { flexDirection: 'row', gap: 8 },
        tab: {
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 999,
          backgroundColor: t.accentSoft,
          borderWidth: 1,
          borderColor: t.border,
        },
        tabOn: { backgroundColor: t.accent, borderColor: t.accent },
        tabText: { color: t.muted, fontWeight: '700', fontSize: 13 },
        tabTextOn: { color: '#fff' },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          paddingVertical: 10,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: t.border,
        },
        rowMe: { backgroundColor: t.accentSoft, marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 8 },
        name: { flex: 1, color: t.text, fontWeight: '700', fontSize: 15 },
        nameMe: { color: t.accent },
        value: { color: t.accent, fontWeight: '800', fontSize: 14 },
        empty: { color: t.muted, fontSize: 13, lineHeight: 20, paddingVertical: 8 },
        period: { color: t.muted, fontSize: 11, fontWeight: '600' },
      }),
    [t],
  );

  if (!user?.email) return null;

  const items = activeTab === 'friends' ? friends : globalItems;
  const loading = activeTab === 'friends' ? loadingFriends : loadingGlobal;

  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.header}
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerHint}>
            {open ? 'Gizlemek için dokun' : 'Sıralamayı görmek için dokun'}
          </Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={t.muted} />
      </Pressable>

      {open ? (
        <View style={styles.body}>
          <Text style={styles.period}>Dönem: {periodKey}</Text>
          <View style={styles.tabs}>
            {TABS.map((tab) => (
              <Pressable
                key={tab.id}
                style={[styles.tab, activeTab === tab.id && styles.tabOn]}
                onPress={() => setActiveTab(tab.id)}>
                <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextOn]}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {loading ? (
            <ActivityIndicator color={t.accent} style={{ marginVertical: 12 }} />
          ) : items.length === 0 ? (
            <Text style={styles.empty}>
              {activeTab === 'friends'
                ? 'Henüz arkadaş skoru yok. Oyna, ilk skor senin olsun.'
                : 'Bu dönemde henüz kimse oynamamış.'}
            </Text>
          ) : (
            <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {items.map((entry) => (
                <View key={entry.user.id} style={[styles.row, entry.is_me && styles.rowMe]}>
                  <Text style={[styles.name, entry.is_me && styles.nameMe]} numberOfLines={1}>
                    {displayName(entry)}
                    {entry.is_me ? ' · sen' : ''}
                  </Text>
                  <Text style={styles.value}>{formatValue(game, entry)}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      ) : null}
    </View>
  );
}
