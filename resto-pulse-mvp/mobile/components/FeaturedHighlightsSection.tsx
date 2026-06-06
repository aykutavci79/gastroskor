import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FeaturedCompactCard, FEATURED_CARD_WIDTH } from '@/components/FeaturedCompactCard';
import { GastroColors } from '@/constants/theme';
import { listTrendingRestaurantsWeek } from '@/lib/api';
import { filterFeaturedByRating } from '@/lib/featured-rating-filter';
import { formatDistanceLabel } from '@/lib/travel-estimate';
import { restaurantDetailHref } from '@/lib/uuid';
import type { RestaurantTrendingItem } from '@/lib/types';

type LocationState = 'loading' | 'granted' | 'denied';

export function FeaturedHighlightsSection() {
  const [items, setItems] = useState<RestaurantTrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationState, setLocationState] = useState<LocationState>('loading');

  const loadFeatured = useCallback(async (coords: { lat: number; lng: number } | null) => {
    setLoading(true);
    try {
      const raw = await listTrendingRestaurantsWeek({
        lat: coords?.lat,
        lng: coords?.lng,
        city: 'Bursa',
        limit: 12,
        source: 'google',
      });
      setItems(filterFeaturedByRating(raw, 6));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          setLocationState('denied');
          setLoading(false);
          return;
        }
        setLocationState('granted');
        const pos = await Location.getCurrentPositionAsync({});
        if (!cancelled) {
          await loadFeatured({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      } catch {
        if (!cancelled) {
          setLocationState('denied');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadFeatured]);

  async function requestLocationAgain() {
    setLocationState('loading');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationState('denied');
        return;
      }
      setLocationState('granted');
      const pos = await Location.getCurrentPositionAsync({});
      await loadFeatured({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      setLocationState('denied');
    }
  }

  return (
    <View style={styles.section}>
      <View style={styles.titles}>
        <Text style={styles.title}>⭐ Öne Çıkanlar</Text>
        <Text style={styles.sub}>Konumuna yakın, 4.5+ yıldızlı restoranlar</Text>
      </View>

      {locationState === 'denied' ? (
        <View style={styles.locationBox}>
          <Text style={styles.locationTitle}>Konumunuzu paylaşın</Text>
          <Text style={styles.locationSub}>
            Yakınındaki öne çıkan restoranları göstermek için konum izni gerekli.
          </Text>
          <Pressable style={styles.locationBtn} onPress={() => void requestLocationAgain()}>
            <Text style={styles.locationBtnText}>Konumu aç</Text>
          </Pressable>
        </View>
      ) : null}

      {locationState === 'loading' || (locationState === 'granted' && loading) ? (
        <ActivityIndicator color={GastroColors.accent} style={{ marginVertical: 24 }} />
      ) : null}

      {locationState === 'granted' && !loading && items.length === 0 ? (
        <Text style={styles.empty}>Şu an öne çıkan restoran bulunamadı.</Text>
      ) : null}

      {locationState === 'granted' && !loading && items.length > 0 ? (
        <FlatList
          data={items}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={styles.listContent}
          snapToInterval={FEATURED_CARD_WIDTH + 12}
          decelerationRate="fast"
          renderItem={({ item }) => {
            const detailHref = restaurantDetailHref({
              id: item.id,
              restaurant_id: item.restaurant_id,
              google_place_id: item.google_place_id,
            });
            return (
              <FeaturedCompactCard
                restaurant={item}
                href={detailHref}
                googleRating={item.week_avg_rating ?? item.google_rating}
                distanceLabel={formatDistanceLabel(item)}
              />
            );
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  titles: { gap: 4 },
  title: { color: GastroColors.text, fontSize: 20, fontWeight: '800' },
  sub: { color: GastroColors.muted, fontSize: 13, lineHeight: 18 },
  listContent: { gap: 12, paddingRight: 8 },
  locationBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    padding: 16,
    gap: 8,
  },
  locationTitle: { color: GastroColors.text, fontSize: 15, fontWeight: '800' },
  locationSub: { color: GastroColors.muted, fontSize: 13, lineHeight: 18 },
  locationBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: GastroColors.accent,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  locationBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  empty: { color: GastroColors.muted, fontSize: 13, paddingVertical: 12 },
});
