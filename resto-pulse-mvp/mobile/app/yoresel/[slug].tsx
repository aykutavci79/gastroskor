import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { RestaurantCard } from '@/components/RestaurantCard';
import { Screen } from '@/components/ui/Screen';
import { GastroColors } from '@/constants/theme';
import { useCity } from '@/context/city-context';
import { discoverRegionalProduct } from '@/lib/api';
import { resolveDeviceCoords } from '@/lib/device-location';
import { formatApiError } from '@/lib/format-api-error';
import {
  livePlaceDistanceLabel,
  livePlaceToRestaurantCard,
  sortLivePlacesByGastroScore,
} from '@/lib/live-place-card';
import type { LivePlaceSearchItem, RegionalProductItem } from '@/lib/types';
import { restaurantDetailHref } from '@/lib/uuid';

export default function YoreselProductScreen() {
  const { city, fallbackCoords } = useCity();
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const [product, setProduct] = useState<RegionalProductItem | null>(null);
  const [liveItems, setLiveItems] = useState<LivePlaceSearchItem[]>([]);
  const [discoveryNote, setDiscoveryNote] = useState<string | null>(null);
  const [searchNote, setSearchNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const coords = await resolveDeviceCoords({ requestPermission: true, timeoutMs: 12_000 });
      const origin_lat = coords?.lat ?? fallbackCoords.lat;
      const origin_lng = coords?.lng ?? fallbackCoords.lng;

      const detail = await discoverRegionalProduct(slug, {
        city,
        origin_lat,
        origin_lng,
        limit: 20,
      });
      setProduct(detail.product);
      setDiscoveryNote(detail.discovery_note);

      const sorted = sortLivePlacesByGastroScore(detail.places ?? []);
      setLiveItems(sorted);

      if (detail.places_error) {
        setSearchNote(detail.places_error);
      } else if (sorted.length > 0) {
        setSearchNote(t('yoresel.searchCount', { count: sorted.length }));
      } else {
        setSearchNote(t('yoresel.searchEmpty', { query: detail.search_query }));
      }
    } catch (err) {
      setError(formatApiError(err));
      setLiveItems([]);
    } finally {
      setLoading(false);
    }
  }, [slug, city, fallbackCoords, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>{t('yoresel.back')}</Text>
        </Pressable>

        {loading ? <ActivityIndicator color={GastroColors.accent} style={{ marginTop: 20 }} /> : null}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={() => void load()} style={styles.retryBtn}>
              <Text style={styles.retryText}>{t('yoresel.retry')}</Text>
            </Pressable>
          </View>
        ) : null}

        {product ? (
          <>
            <Text style={styles.kicker}>{t('yoresel.detailKicker')}</Text>
            <Text style={styles.title}>{product.name}</Text>
            <Text style={styles.sub}>{product.summary}</Text>
            {discoveryNote ? <Text style={styles.note}>{discoveryNote}</Text> : null}
            {searchNote ? <Text style={styles.searchNote}>{searchNote}</Text> : null}
          </>
        ) : null}

        <View style={styles.list}>
          {liveItems.map((item) => {
            const card = livePlaceToRestaurantCard(item);
            const href = restaurantDetailHref({
              id: card.id,
              restaurant_id: card.restaurant_id,
              google_place_id: item.place_id,
              liveScores: {
                gastro_score: item.gastro_score,
                distance_score: item.distance_score,
                rating_score: item.rating_score,
                distance_meters: item.distance_meters,
                distance_origin: item.distance_origin,
                rating: item.rating,
              },
            });
            return (
              <RestaurantCard
                key={item.place_id}
                restaurant={card}
                distanceLabel={livePlaceDistanceLabel(item)}
                href={href}
                googleRating={item.rating}
                googleReviewCount={item.user_ratings_total}
              />
            );
          })}
        </View>

        {!loading && liveItems.length === 0 && !error ? (
          <View style={styles.emptyBox}>
            <Text style={styles.empty}>{t('yoresel.detailEmpty')}</Text>
            <Pressable onPress={() => void load()} style={styles.retryBtn}>
              <Text style={styles.retryText}>{t('yoresel.refresh')}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 32, gap: 12 },
  back: { color: GastroColors.muted, fontSize: 14 },
  kicker: { color: GastroColors.gold, fontSize: 11, fontWeight: '700', marginTop: 8 },
  title: { color: GastroColors.text, fontSize: 24, fontWeight: '700', marginTop: 4 },
  sub: { color: GastroColors.muted, fontSize: 14, lineHeight: 20 },
  note: { color: GastroColors.muted, fontSize: 12, lineHeight: 18 },
  searchNote: { color: GastroColors.gold, fontSize: 12, fontWeight: '600' },
  list: { marginTop: 8, gap: 12 },
  errorBox: { marginTop: 12, gap: 8 },
  error: { color: GastroColors.accent },
  emptyBox: { marginTop: 16, gap: 12, alignItems: 'center' },
  empty: { color: GastroColors.muted, textAlign: 'center' },
  retryBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GastroColors.gold,
  },
  retryText: { color: GastroColors.gold, fontSize: 13, fontWeight: '600' },
});
