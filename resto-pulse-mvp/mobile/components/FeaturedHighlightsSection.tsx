import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  FeaturedCompactCard,
  FEATURED_CARD_HEIGHT,
  FEATURED_CARD_WIDTH,
} from '@/components/FeaturedCompactCard';
import { GastroColors } from '@/constants/theme';
import { listTrendingRestaurantsWeek } from '@/lib/api';
import { resolveDeviceCoords } from '@/lib/device-location';
import { filterFeaturedByRating } from '@/lib/featured-rating-filter';
import { formatDistanceLabel } from '@/lib/travel-estimate';
import { restaurantDetailHref } from '@/lib/uuid';
import type { RestaurantTrendingItem } from '@/lib/types';

type LocationState = 'loading' | 'granted' | 'denied';

const FEATURED_GAP = 12;
const AUTO_SCROLL_MS = 5000;

export function FeaturedHighlightsSection() {
  const [items, setItems] = useState<RestaurantTrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationState, setLocationState] = useState<LocationState>('loading');
  const scrollRef = useRef<ScrollView>(null);
  const activeIndexRef = useRef(0);

  const loadFeatured = useCallback(async (coords: { lat: number; lng: number } | null) => {
    setLoading(true);
    try {
      let raw = await listTrendingRestaurantsWeek({
        lat: coords?.lat,
        lng: coords?.lng,
        city: 'Bursa',
        limit: 12,
        source: 'google',
      });
      if (raw.length === 0) {
        raw = await listTrendingRestaurantsWeek({
          lat: coords?.lat,
          lng: coords?.lng,
          city: 'Bursa',
          limit: 12,
          source: 'gastroskor',
        });
      }
      setItems(filterFeaturedByRating(raw, 6));
    } catch {
      try {
        const fallback = await listTrendingRestaurantsWeek({
          lat: coords?.lat,
          lng: coords?.lng,
          city: 'Bursa',
          limit: 12,
          source: 'gastroskor',
        });
        setItems(filterFeaturedByRating(fallback, 6));
      } catch {
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;

      if (status !== 'granted') {
        setLocationState('denied');
        await loadFeatured(null);
        return;
      }

      setLocationState('granted');
      // iOS GPS takilmasin: once konumsuz yukle, sonra hassas konumla yenile.
      await loadFeatured(null);
      if (cancelled) return;
      const coords = await resolveDeviceCoords({ requestPermission: false });
      if (cancelled || !coords) return;
      await loadFeatured(coords);
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [loadFeatured]);

  useEffect(() => {
    activeIndexRef.current = 0;
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return undefined;

    const stride = FEATURED_CARD_WIDTH + FEATURED_GAP;
    const timer = setInterval(() => {
      const next = (activeIndexRef.current + 1) % items.length;
      activeIndexRef.current = next;
      scrollRef.current?.scrollTo({ x: next * stride, animated: true });
    }, AUTO_SCROLL_MS);

    return () => clearInterval(timer);
  }, [items.length]);

  function onFeaturedScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const stride = FEATURED_CARD_WIDTH + FEATURED_GAP;
    const x = event.nativeEvent.contentOffset.x;
    activeIndexRef.current = Math.max(0, Math.min(items.length - 1, Math.round(x / stride)));
  }

  async function requestLocationAgain() {
    setLocationState('loading');
    setLoading(true);
    try {
      const coords = await resolveDeviceCoords({ requestPermission: true });
      setLocationState(coords ? 'granted' : 'denied');
      await loadFeatured(coords);
    } catch {
      setLocationState('denied');
      await loadFeatured(null);
    }
  }

  return (
    <View style={styles.section}>
      <View style={styles.titles}>
        <Text style={styles.title}>⭐ Öne Çıkanlar</Text>
        <Text style={styles.sub}>Konumuna yakın, 4.5+ yıldızlı restoranlar</Text>
      </View>

      {locationState === 'denied' && !loading && items.length === 0 ? (
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

      {loading ? (
        <ActivityIndicator color={GastroColors.accent} style={{ marginVertical: 24 }} />
      ) : null}

      {!loading && items.length === 0 ? (
        <Text style={styles.empty}>Şu an öne çıkan restoran bulunamadı.</Text>
      ) : null}

      {!loading && items.length > 0 ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={FEATURED_CARD_WIDTH + FEATURED_GAP}
          snapToAlignment="start"
          onMomentumScrollEnd={onFeaturedScrollEnd}
          onScrollEndDrag={onFeaturedScrollEnd}
          style={styles.strip}
          contentContainerStyle={styles.listContent}>
          {items.map((item, index) => {
            const detailHref = restaurantDetailHref({
              id: item.id,
              restaurant_id: item.restaurant_id,
              google_place_id: item.google_place_id,
            });
            return (
              <FeaturedCompactCard
                key={`${item.id}-${index}`}
                restaurant={item}
                href={detailHref}
                googleRating={item.week_avg_rating ?? item.google_rating}
                distanceLabel={formatDistanceLabel(item)}
              />
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  titles: { gap: 4 },
  title: { color: GastroColors.text, fontSize: 20, fontWeight: '800' },
  sub: { color: GastroColors.muted, fontSize: 13, lineHeight: 18 },
  listContent: { gap: FEATURED_GAP, paddingRight: 8 },
  strip: { height: FEATURED_CARD_HEIGHT },
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
