import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RestaurantCard } from '@/components/RestaurantCard';
import { Screen } from '@/components/ui/Screen';
import { GastroColors } from '@/constants/theme';
import { listRegionalProductRestaurants } from '@/lib/api';
import { formatApiError } from '@/lib/format-api-error';
import type { RegionalProductItem, RestaurantListItem } from '@/lib/types';

export default function YoreselProductScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const [product, setProduct] = useState<RegionalProductItem | null>(null);
  const [items, setItems] = useState<RestaurantListItem[]>([]);
  const [note, setNote] = useState<string | null>(null);
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
      const data = await listRegionalProductRestaurants(slug, {
        city: 'Bursa',
        origin_lat,
        origin_lng,
        min_rating: 4.5,
        limit: 30,
      });
      setProduct(data.product);
      setItems(data.items);
      setNote(
        data.rating_relaxed
          ? `4.5+ yok; ${data.applied_min_rating}+ puanlı restoranlar.`
          : `${data.applied_min_rating}+ puan, yakından uzağa.`,
      );
    } catch (err) {
      setError(formatApiError(err));
      setItems([]);
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
            <Text style={styles.title}>{product.name}</Text>
            <Text style={styles.sub}>{product.summary}</Text>
            {note ? <Text style={styles.note}>{note}</Text> : null}
          </>
        ) : null}

        <View style={styles.list}>
          {items.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              cornerBadge="MAHREÇ"
            />
          ))}
        </View>

        {!loading && items.length === 0 && !error ? (
          <Text style={styles.empty}>Bu lezzet için uygun restoran bulunamadı.</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 32, gap: 12 },
  back: { color: GastroColors.muted, fontSize: 14 },
  title: { color: GastroColors.text, fontSize: 24, fontWeight: '700', marginTop: 8 },
  sub: { color: GastroColors.muted, fontSize: 14, lineHeight: 20 },
  note: { color: GastroColors.gold, fontSize: 12 },
  list: { marginTop: 8, gap: 12 },
  error: { color: GastroColors.accent, marginTop: 12 },
  empty: { color: GastroColors.muted, marginTop: 16, textAlign: 'center' },
});
