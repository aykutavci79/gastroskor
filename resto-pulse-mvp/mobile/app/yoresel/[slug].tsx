import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RestaurantCard } from '@/components/RestaurantCard';
import { Screen } from '@/components/ui/Screen';
import { GastroColors } from '@/constants/theme';
import { getRegionalProduct, searchLivePlaces } from '@/lib/api';
import { formatApiError } from '@/lib/format-api-error';
import { livePlaceDistanceLabel, livePlaceGoogleId, livePlaceToRestaurantCard } from '@/lib/live-place-card';
import type { LivePlaceSearchItem, RegionalProductItem } from '@/lib/types';

export default function YoreselProductScreen() {
  const router = useRouter();
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
      let origin_lat: number | undefined;
      let origin_lng: number | undefined;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({});
          origin_lat = pos.coords.latitude;
          origin_lng = pos.coords.longitude;
        }
      } catch {
        /* konum opsiyonel */
      }

      const detail = await getRegionalProduct(slug, { city: 'Bursa' });
      setProduct(detail.product);
      setDiscoveryNote(detail.discovery_note);

      try {
        const live = await searchLivePlaces({
          q: detail.product.live_search_query,
          city: 'Bursa',
          origin_lat,
          origin_lng,
          limit: 20,
        });
        setLiveItems(live.items);
        setSearchNote(
          live.items.length > 0
            ? `Canlı arama: "${detail.product.live_search_query}"`
            : 'Canlı arama sonucu bulunamadı.',
        );
      } catch {
        setLiveItems([]);
        setSearchNote('Canlı arama şu an kullanılamıyor.');
      }
    } catch (err) {
      setError(formatApiError(err));
      setLiveItems([]);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Yöresel lezzetler</Text>
        </Pressable>

        {loading ? <ActivityIndicator color={GastroColors.accent} style={{ marginTop: 20 }} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {product ? (
          <>
            <Text style={styles.kicker}>TÜRKPATENT tescilli ürün</Text>
            <Text style={styles.title}>{product.name}</Text>
            <Text style={styles.sub}>{product.summary}</Text>
            {discoveryNote ? <Text style={styles.note}>{discoveryNote}</Text> : null}
            {searchNote ? <Text style={styles.searchNote}>{searchNote}</Text> : null}
          </>
        ) : null}

        <View style={styles.list}>
          {liveItems.map((item) => {
            const card = livePlaceToRestaurantCard(item);
            return (
              <RestaurantCard
                key={item.place_id}
                restaurant={card}
                distanceLabel={livePlaceDistanceLabel(item)}
                href={`/restaurant/${livePlaceGoogleId(item)}`}
              />
            );
          })}
        </View>

        {!loading && liveItems.length === 0 && !error ? (
          <Text style={styles.empty}>Bu lezzet için canlı arama sonucu bulunamadı.</Text>
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
  error: { color: GastroColors.accent, marginTop: 12 },
  empty: { color: GastroColors.muted, marginTop: 16, textAlign: 'center' },
});
