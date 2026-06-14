import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';

import { FoodCastTitle } from '@/components/FoodCastTitle';
import { FoodcastReportSheet } from '@/components/FoodcastReportSheet';
import type { GastroColorScheme, GastroShadowScheme } from '@/constants/theme';
import { useCity } from '@/context/city-context';
import { useGastroTheme } from '@/context/theme-context';
import { useSession } from '@/context/session-context';
import { getFoodcastFeed, reportFoodcastPhoto } from '@/lib/api';
import { formatApiError } from '@/lib/format-api-error';
import type { FoodcastPhotoItem, FoodcastReportReason } from '@/lib/foodcast-types';
import { peekTileWidth } from '@/lib/horizontal-peek-layout';
import { formatRelativeTimeTr } from '@/lib/relative-time-tr';

const TILE_GAP = 10;
const PEEK_RIGHT = 40;
const STRIP_LIMIT = 10;

type Props = {
  style?: ViewStyle;
  onDismissKeyboard?: () => void;
};

export function RecentPhotosStrip({ style, onDismissKeyboard }: Props) {
  const { city } = useCity();
  const { colors, shadow } = useGastroTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [colors, shadow]);
  const router = useRouter();
  const { user } = useSession();
  const { width: screenWidth } = useWindowDimensions();
  const tileWidth = peekTileWidth(screenWidth, { gap: TILE_GAP, peekRight: PEEK_RIGHT });

  const [items, setItems] = useState<FoodcastPhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportTarget, setReportTarget] = useState<FoodcastPhotoItem | null>(null);
  const [reportBusy, setReportBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const feed = await getFoodcastFeed({ city, limit: STRIP_LIMIT });
      setItems(feed.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
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

  if (!loading && items.length === 0) {
    return (
      <Pressable style={[styles.section, style]} onPress={onDismissKeyboard} accessible={false}>
        <View style={styles.header}>
          <View>
            <FoodCastTitle />
            <Text style={styles.sub}>Gerçek tabaklar · restoran etiketli</Text>
          </View>
          <Pressable hitSlop={8} onPress={() => router.push('/foodcast' as Href)}>
            <Text style={styles.link}>Tümü →</Text>
          </Pressable>
        </View>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Henüz FoodCast paylaşımı yok</Text>
          <Text style={styles.emptySub}>İlk tabağı sen paylaş — keşfette burada görünür.</Text>
          <Pressable style={styles.emptyBtn} onPress={() => router.push('/foodcast/paylas' as Href)}>
            <Text style={styles.emptyBtnText}>Tabak paylaş</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  }

  return (
    <>
      <Pressable style={[styles.section, style]} onPress={onDismissKeyboard} accessible={false}>
        <View style={styles.header}>
          <View>
            <FoodCastTitle />
            <Text style={styles.sub}>Gerçek tabaklar · restoran etiketli</Text>
          </View>
          <Pressable hitSlop={8} onPress={() => router.push('/foodcast' as Href)}>
            <Text style={styles.link}>Tümü →</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 8 }} />
        ) : (
          <View style={styles.stripHost}>
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              style={styles.stripScroll}
              contentContainerStyle={styles.strip}>
              {items.map((row) => (
                <Pressable
                  key={row.id}
                  style={[styles.tileCol, { width: tileWidth }]}
                  onPress={() => router.push(`/restaurant/${row.restaurant_id}` as Href)}>
                  <View style={styles.tileImage}>
                    <Image source={{ uri: row.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    <Pressable
                      style={styles.reportBtn}
                      hitSlop={6}
                      onPress={(e) => {
                        e.stopPropagation();
                        setReportTarget(row);
                      }}>
                      <Text style={styles.reportText}>!</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.dish} numberOfLines={1}>
                    {row.dish_name}
                  </Text>
                  <Text style={styles.place} numberOfLines={1}>
                    {row.restaurant_name}
                  </Text>
                  <Text style={styles.ago}>{formatRelativeTimeTr(row.created_at)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </Pressable>

      <FoodcastReportSheet
        visible={reportTarget != null}
        busy={reportBusy}
        onClose={() => setReportTarget(null)}
        onSubmit={(reason) => void submitReport(reason)}
      />
    </>
  );
}

function createStyles(colors: GastroColorScheme, shadow: GastroShadowScheme) {
  return StyleSheet.create({
  section: {
    paddingLeft: 12,
    gap: 8,
    flex: 1,
    minHeight: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 12,
    flexShrink: 0,
  },
  sub: { color: colors.muted, fontSize: 10, marginTop: 2 },
  link: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  stripHost: { flex: 1, minHeight: 0 },
  stripScroll: { flex: 1 },
  strip: {
    paddingRight: 12,
    gap: TILE_GAP,
    alignItems: 'stretch',
    minHeight: '100%',
  },
  tileCol: { flexShrink: 0, alignSelf: 'stretch', gap: 4 },
  tileImage: {
    flex: 1,
    minHeight: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    overflow: 'hidden',
    position: 'relative',
  },
  reportBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.62)',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  reportText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  dish: { color: colors.text, fontSize: 11, fontWeight: '800', lineHeight: 14 },
  place: { color: colors.muted, fontSize: 10, fontWeight: '600', lineHeight: 13 },
  ago: { color: colors.placeholder, fontSize: 9 },
  emptyBox: {
    flex: 1,
    minHeight: 100,
    marginRight: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: 14,
    justifyContent: 'center',
    gap: 6,
    ...shadow.card,
  },
  emptyTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  emptySub: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  emptyBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderRadius: 10,
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emptyBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  });
}
