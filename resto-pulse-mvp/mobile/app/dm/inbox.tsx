import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { UserAvatar } from '@/components/UserAvatar';
import { GastroColors, GastroStyles } from '@/constants/theme';
import { useSession } from '@/context/session-context';
import { listDmInbox } from '@/lib/api';
import type { DmThreadSummary } from '@/lib/types';

function formatWhen(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function DmInboxScreen() {
  const router = useRouter();
  const { user } = useSession();
  const [items, setItems] = useState<DmThreadSummary[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    listDmInbox(user.email)
      .then((data) => {
        setItems(data.items);
        setUnreadTotal(data.unread_total);
      })
      .catch((err) => {
        setItems([]);
        setUnreadTotal(0);
        setError(err instanceof Error ? err.message : 'Mesajlar yuklenemedi.');
      })
      .finally(() => setLoading(false));
  }, [user?.email]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!user?.email) {
    return (
      <Screen>
        <Text style={styles.muted}>Ozel mesajlar icin giris yap.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.title}>Ozel mesajlar</Text>
        {unreadTotal > 0 ? (
          <Text style={styles.unreadBadge}>{unreadTotal} okunmamis</Text>
        ) : (
          <Text style={styles.sub}>Arkadaslarin ve sohbetten actigin konusmalar burada.</Text>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={GastroColors.accent} style={{ marginTop: 24 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : items.length === 0 ? (
        <Text style={styles.muted}>
          Henuz ozel mesaj yok. Gurme sohbette birine dokunup Ozel mesaj gonder ile basla.
        </Text>
      ) : (
        <View style={styles.list}>
          {items.map((thread) => (
            <Pressable
              key={thread.id}
              style={({ pressed }) => [GastroStyles.card, styles.row, pressed && { opacity: 0.92 }]}
              onPress={() =>
                router.push({
                  pathname: '/dm/[threadId]',
                  params: { threadId: thread.id, nickname: thread.peer.nickname },
                } as never)
              }>
              <UserAvatar
                avatarUrl={thread.peer.avatar_url}
                avatarPreset={thread.peer.avatar_preset}
                size={44}
                fallbackLabel={thread.peer.nickname}
              />
              <View style={styles.rowMeta}>
                <Text style={styles.rowName}>@{thread.peer.nickname}</Text>
                <Text style={styles.preview} numberOfLines={1}>
                  {thread.last_message ?? 'Sohbeti baslat'}
                </Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.when}>{formatWhen(thread.last_message_at)}</Text>
                {thread.unread_count > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {thread.unread_count > 9 ? '9+' : thread.unread_count}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 6, marginBottom: 8 },
  title: { color: GastroColors.text, fontSize: 22, fontWeight: '800' },
  sub: { color: GastroColors.muted, fontSize: 13, lineHeight: 18 },
  unreadBadge: { color: GastroColors.accent, fontWeight: '700', fontSize: 13 },
  list: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowMeta: { flex: 1, gap: 4 },
  rowName: { color: GastroColors.text, fontWeight: '800', fontSize: 15 },
  preview: { color: GastroColors.muted, fontSize: 13 },
  rowRight: { alignItems: 'flex-end', gap: 6 },
  when: { color: GastroColors.muted, fontSize: 10 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: GastroColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  muted: { color: GastroColors.muted, lineHeight: 20 },
  error: { color: GastroColors.bad, lineHeight: 20 },
});
