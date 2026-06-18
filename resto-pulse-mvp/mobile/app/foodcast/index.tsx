import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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

const GRID_COLUMNS = 2;
const GRID_GAP = 8;

function FoodcastGridTile({
  row,
  onOpen,
  onReport,
}: {
  row: FoodcastPhotoItem;
  onOpen: () => void;
  onReport: () => void;
}) {
  return (
    <View style={styles.cell}>
      <Pressable
        style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${row.dish_name}, ${row.restaurant_name}`}>
        <Image source={{ uri: row.image_url }} style={styles.tilePhoto} contentFit="cover" />
        <View style={styles.tileOverlay}>
          <Text style={styles.tileDish} numberOfLines={1}>
            {row.dish_name}
          </Text>
          <Text style={styles.tilePlace} numberOfLines={1}>
            {row.restaurant_name}
          </Text>
          <Text style={styles.tileMeta} numberOfLines={1}>
            {row.author_label} · {formatRelativeTimeTr(row.created_at)}
          </Text>
        </View>
        <Pressable
          style={styles.tileReportBtn}
          hitSlop={8}
          onPress={onReport}
          accessibilityRole="button"
          accessibilityLabel="Bildir">
          <Text style={styles.tileReportText}>···</Text>
        </Pressable>
      </Pressable>
    </View>
  );
}

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
  const hasItemsRef = useRef(false);
  hasItemsRef.current = items.length > 0;

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

  useFocusEffect(
    useCallback(() => {
      void load({ refresh: hasItemsRef.current });
    }, [load]),
  );

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

        <View style={styles.grid}>
          {items.map((row) => (
            <FoodcastGridTile
              key={row.id}
              row={row}
              onOpen={() => router.push(`/restaurant/${row.restaurant_id}` as Href)}
              onReport={() => setReportTarget(row)}
            />
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
  grid: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -GRID_GAP / 2,
  },
  cell: {
    width: `${100 / GRID_COLUMNS}%`,
    padding: GRID_GAP / 2,
  },
  tile: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
  },
  tilePressed: { opacity: 0.92 },
  tilePhoto: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: GastroColors.input,
  },
  tileOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingVertical: 7,
    gap: 1,
    backgroundColor: 'rgba(20, 20, 20, 0.72)',
  },
  tileDish: { color: GastroColors.text, fontSize: 13, fontWeight: '800' },
  tilePlace: { color: GastroColors.muted, fontSize: 11, fontWeight: '600' },
  tileMeta: { color: GastroColors.placeholder, fontSize: 10, marginTop: 1 },
  tileReportBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 28,
    minHeight: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 20, 20, 0.55)',
  },
  tileReportText: {
    color: GastroColors.text,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
    marginTop: -4,
  },
});
