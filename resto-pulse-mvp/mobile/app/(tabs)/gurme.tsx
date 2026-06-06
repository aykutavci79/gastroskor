import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { GastroColors, GastroStyles } from '@/constants/theme';
import { listGourmetChatRooms } from '@/lib/api';
import type { GourmetChatRoom } from '@/lib/types';

const CITY = 'Bursa';

export default function GurmeTabScreen() {
  const router = useRouter();
  const [rooms, setRooms] = useState<GourmetChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const payload = await listGourmetChatRooms(CITY);
      setRooms(payload.items);
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
      <View style={styles.hero}>
        <Text style={styles.kicker}>Topluluk · Bursa</Text>
        <Text style={styles.title}>Gurme Sohbetler</Text>
        <Text style={styles.subtitle}>Odaya gir, sohbete katil, @takmaad ile birini etiketle.</Text>
      </View>

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
  hero: { gap: 6 },
  kicker: { color: GastroColors.accent, fontWeight: '700', fontSize: 12, letterSpacing: 0.6 },
  title: { color: GastroColors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: GastroColors.muted, fontSize: 14, lineHeight: 20 },
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
