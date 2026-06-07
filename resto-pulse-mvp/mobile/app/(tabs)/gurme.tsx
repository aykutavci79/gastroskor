import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { TabScreenHeader } from '@/components/TabScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { GastroColors, GastroStyles } from '@/constants/theme';
import { useSession } from '@/context/session-context';
import { listGourmetChatRooms } from '@/lib/api';
import type { GourmetChatRoom } from '@/lib/types';

const CITY = 'Bursa';

export default function GurmeTabScreen() {
  const router = useRouter();
  const { user } = useSession();
  const [rooms, setRooms] = useState<GourmetChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const roomsPayload = await listGourmetChatRooms(CITY);
      setRooms(roomsPayload.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Odalar yuklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void load(true);
      }}>
      <TabScreenHeader
        kicker="Topluluk · Bursa"
        title="Gurme Sohbetler"
        subtitle="Odaya gir, sohbete katil, @takmaad ile birini etiketle."
        showDmAvatar
      />

      {!user?.email ? (
        <View style={styles.guestCard}>
          <Text style={styles.guestText}>Sohbete yazmak icin Hesap sekmesinden giris yap.</Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color={GastroColors.accent} style={{ marginTop: 24 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <View style={styles.list}>
          {rooms.map((room) => (
            <Pressable
              key={room.slug}
              style={({ pressed }) => [GastroStyles.card, styles.roomCard, pressed && { opacity: 0.92 }]}
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
                {room.message_count > 0 ? `${room.message_count} mesaj` : 'Sohbeti baslat'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  guestCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    padding: 14,
  },
  guestText: { color: GastroColors.muted, fontSize: 13, lineHeight: 18 },
  list: { gap: 12 },
  roomCard: { gap: 10 },
  roomTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  roomEmoji: { fontSize: 28, marginTop: 2 },
  roomMeta: { flex: 1, gap: 4 },
  roomTitle: { color: GastroColors.text, fontSize: 17, fontWeight: '800' },
  roomDesc: { color: GastroColors.muted, fontSize: 13, lineHeight: 18 },
  roomCount: { color: GastroColors.gold, fontSize: 12, fontWeight: '700' },
  error: { color: GastroColors.bad, lineHeight: 20 },
});
