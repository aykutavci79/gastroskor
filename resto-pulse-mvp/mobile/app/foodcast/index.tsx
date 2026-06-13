import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FoodCastTitle } from '@/components/FoodCastTitle';
import { FoodcastReportSheet } from '@/components/FoodcastReportSheet';
import { Screen } from '@/components/ui/Screen';
import { GastroColors } from '@/constants/theme';
import { useCity } from '@/context/city-context';
import { useSession } from '@/context/session-context';
import { getFoodcastFeed, reportFoodcastPhoto } from '@/lib/api';
import { formatApiError } from '@/lib/format-api-error';
import type { FoodcastPhotoItem, FoodcastReportReason } from '@/lib/foodcast-types';
import { formatRelativeTimeTr } from '@/lib/relative-time-tr';

export default function FoodcastFeedScreen() {
  const { city, cityLabel } = useCity();
  const router = useRouter();
  const { user } = useSession();
  const [items, setItems] = useState<FoodcastPhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<FoodcastPhotoItem | null>(null);
  const [reportBusy, setReportBusy] = useState(false);

  const load = useCallback(async (opts?: { refresh?: boolean }) => {
    if (opts?.refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const feed = await getFoodcastFeed({ city, limit: 50 });
      setItems(feed.items);
    } catch (err) {
      setError(formatApiError(err));
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [city]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitReport(reason: FoodcastReportReason) {
    if (!reportTarget) return;
    setReportBusy(true);
    try {
      const result = await reportFoodcastPhoto(reportTarget.id, {
        reporter_email: user?.email,
        reason,
      });
      Alert.alert('Bildirim', result.message);
      setReportTarget(null);
    } catch (err) {
      Alert.alert('Bildirim', formatApiError(err));
    } finally {
      setReportBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load({ refresh: true })} tintColor={GastroColors.accent} />
        }>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>← Keşfet</Text>
          </Pressable>
          <Pressable style={styles.shareBtn} onPress={() => router.push('/foodcast/paylas' as Href)}>
            <Text style={styles.shareBtnText}>+ Tabak paylaş</Text>
          </Pressable>
        </View>

        <FoodCastTitle size="md" />
        <Text style={styles.sub}>{cityLabel} · en yeni önce · gerçek tabaklar</Text>

        {loading ? <ActivityIndicator color={GastroColors.accent} style={{ marginTop: 24 }} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!loading && items.length === 0 && !error ? (
          <View style={styles.emptyBox}>
            <Text style={styles.empty}>Henüz FoodCast paylaşımı yok.</Text>
            <Pressable style={styles.shareBtnWide} onPress={() => router.push('/foodcast/paylas' as Href)}>
              <Text style={styles.shareBtnText}>İlk tabağı sen paylaş</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.list}>
          {items.map((row) => (
            <View key={row.id} style={styles.row}>
              <Pressable onPress={() => router.push(`/restaurant/${row.restaurant_id}` as Href)}>
                <Image source={{ uri: row.image_url }} style={styles.photo} contentFit="cover" />
              </Pressable>
              <View style={styles.meta}>
                <Text style={styles.dish}>{row.dish_name}</Text>
                <Text style={styles.place}>{row.restaurant_name}</Text>
                <Text style={styles.author}>
                  {row.author_label} · {formatRelativeTimeTr(row.created_at)}
                </Text>
                {row.caption ? <Text style={styles.caption}>{row.caption}</Text> : null}
                <View style={styles.actions}>
                  <Pressable onPress={() => router.push(`/restaurant/${row.restaurant_id}` as Href)}>
                    <Text style={styles.actionLink}>Detay →</Text>
                  </Pressable>
                  <Pressable onPress={() => setReportTarget(row)}>
                    <Text style={styles.reportLink}>Bildir</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <FoodcastReportSheet
        visible={reportTarget != null}
        busy={reportBusy}
        onClose={() => setReportTarget(null)}
        onSubmit={(reason) => void submitReport(reason)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 12, paddingBottom: 32, gap: 10 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { color: GastroColors.muted, fontSize: 14 },
  shareBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GastroColors.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  shareBtnText: { color: GastroColors.accent, fontSize: 12, fontWeight: '700' },
  sub: { color: GastroColors.muted, fontSize: 12 },
  error: { color: GastroColors.bad, marginTop: 8 },
  emptyBox: { marginTop: 24, gap: 12, alignItems: 'center' },
  empty: { color: GastroColors.muted, textAlign: 'center' },
  shareBtnWide: {
    borderRadius: 10,
    backgroundColor: GastroColors.accentSoft,
    borderWidth: 1,
    borderColor: GastroColors.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  list: { marginTop: 8, gap: 14 },
  row: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    padding: 10,
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 10,
    backgroundColor: GastroColors.input,
  },
  meta: { flex: 1, gap: 3 },
  dish: { color: GastroColors.text, fontSize: 15, fontWeight: '800' },
  place: { color: GastroColors.muted, fontSize: 12, fontWeight: '600' },
  author: { color: GastroColors.placeholder, fontSize: 11 },
  caption: { color: GastroColors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 14, marginTop: 6 },
  actionLink: { color: GastroColors.accent, fontSize: 12, fontWeight: '700' },
  reportLink: { color: GastroColors.muted, fontSize: 12, fontWeight: '600' },
});
