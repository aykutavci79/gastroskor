import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { GoogleReviewsModal } from '@/components/GoogleReviewsModal';
import { RestaurantCard } from '@/components/RestaurantCard';
import { SearchBar } from '@/components/SearchBar';
import { Screen } from '@/components/ui/Screen';
import { GastroColors, GastroStyles } from '@/constants/theme';
import {
  getLivePlaceDetails,
  listRestaurants,
  listTrendingRestaurantsWeek,
  searchLivePlaces,
} from '@/lib/api';
import {
  livePlaceDistanceLabel,
  livePlaceGoogleId,
  livePlaceToRestaurantCard,
} from '@/lib/live-place-card';
import { formatDistanceLabel } from '@/lib/travel-estimate';
import { resolveRestaurantDetailId } from '@/lib/uuid';
import type { LivePlaceReview, LivePlaceSearchItem, RestaurantListItem, RestaurantTrendingItem } from '@/lib/types';

type Coords = { lat: number; lng: number };

export default function ExploreScreen() {
  const coordsRef = useRef<Coords | null>(null);
  const [inputQuery, setInputQuery] = useState('');
  const [inputCity, setInputCity] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [activeCity, setActiveCity] = useState('');

  const [restaurants, setRestaurants] = useState<RestaurantListItem[]>([]);
  const [liveItems, setLiveItems] = useState<LivePlaceSearchItem[]>([]);
  const [searchSource, setSearchSource] = useState<'db' | 'live'>('db');
  const [trending, setTrending] = useState<RestaurantTrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [reviewsTitle, setReviewsTitle] = useState<string | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<LivePlaceReview[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const pos = await Location.getCurrentPositionAsync({});
        if (!cancelled) {
          coordsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        }
      } catch {
        // Konum opsiyonel
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadTrending = useCallback(async (city: string) => {
    const coords = coordsRef.current;
    return listTrendingRestaurantsWeek({
      lat: coords?.lat,
      lng: coords?.lng,
      city: city.trim() || 'Bursa',
      limit: 6,
    });
  }, []);

  const loadRestaurants = useCallback(async (query: string, city: string) => {
    const coords = coordsRef.current;
    const q = query.trim();
    const c = city.trim();

    if (q.length >= 2) {
      const result = await searchLivePlaces({
        q,
        city: c || 'Bursa',
        limit: 20,
        origin_lat: coords?.lat,
        origin_lng: coords?.lng,
      });
      setLiveItems(result.items);
      setRestaurants(result.items.map(livePlaceToRestaurantCard));
      setSearchSource('live');
      return;
    }

    const list = await listRestaurants({
      q: q || undefined,
      city: c || undefined,
      origin_lat: coords?.lat,
      origin_lng: coords?.lng,
    });
    setLiveItems([]);
    setRestaurants(list);
    setSearchSource('db');
  }, []);

  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const [_, trend] = await Promise.all([
        loadRestaurants(activeQuery, activeCity),
        loadTrending(activeCity),
      ]);
      setTrending(trend);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veri yuklenemedi');
    }
  }, [activeQuery, activeCity, loadRestaurants, loadTrending]);

  useEffect(() => {
    setLoading(true);
    loadAll().finally(() => setLoading(false));
  }, [loadAll]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveQuery(inputQuery.trim());
      setActiveCity(inputCity.trim());
    }, 500);
    return () => clearTimeout(timer);
  }, [inputQuery, inputCity]);

  function commitSearch() {
    setActiveQuery(inputQuery.trim());
    setActiveCity(inputCity.trim());
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }

  async function openGoogleReviews(placeId: string, name: string) {
    setReviewsOpen(true);
    setReviewsTitle(name);
    setReviewsLoading(true);
    setReviewsError(null);
    setReviews([]);
    try {
      const details = await getLivePlaceDetails(placeId);
      setReviews(details.reviews ?? []);
    } catch (err) {
      setReviewsError(err instanceof Error ? err.message : 'Yorumlar yuklenemedi');
    } finally {
      setReviewsLoading(false);
    }
  }

  const sectionSub =
    searchSource === 'live' && activeQuery.length >= 2
      ? `Google canlı arama · "${activeQuery}"`
      : activeQuery || activeCity
        ? 'Kayıtlı restoranlar'
        : 'Tüm kayıtlı restoranlar';

  return (
    <Screen scroll style={styles.page} refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>GastroSkor</Text>
        <Text style={styles.heroTitle}>Türkiye restoranlarını puanla</Text>
        <Text style={styles.heroSub}>
          İsim yazınca Google canlı arama; üye işletmeler altın çerçeve ile listelenir.
        </Text>
      </View>

      <SearchBar
        query={inputQuery}
        city={inputCity}
        onQueryChange={setInputQuery}
        onCityChange={setInputCity}
        onSearch={commitSearch}
        searching={loading}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionTitles}>
            <Text style={styles.sectionTitle}>Restoranlar</Text>
            <Text style={styles.sectionSub}>{sectionSub}</Text>
          </View>
          <Text style={styles.count}>{restaurants.length} sonuç</Text>
        </View>
        {loading ? (
          <ActivityIndicator color={GastroColors.accent} style={{ marginVertical: 16 }} />
        ) : restaurants.length === 0 ? (
          <Text style={styles.empty}>
            {activeQuery.length >= 2
              ? 'Canlı aramada sonuç bulunamadı. Farklı bir isim veya şehir deneyin.'
              : 'Sonuç bulunamadı. En az 2 harf yazarak Google araması yapabilirsiniz.'}
          </Text>
        ) : (
          restaurants.map((r, index) => {
            const liveItem = searchSource === 'live' ? liveItems[index] : null;
            const detailId = resolveRestaurantDetailId(r);
            const googlePlaceId = liveItem ? livePlaceGoogleId(liveItem) : null;
            const isLiveGoogle = searchSource === 'live' && !detailId && googlePlaceId;

            return (
              <RestaurantCard
                key={`${searchSource}-${r.id}-${index}`}
                restaurant={r}
                googleRating={r.google_rating}
                googleReviewCount={r.google_review_count}
                distanceLabel={
                  liveItem ? livePlaceDistanceLabel(liveItem) : formatDistanceLabel(r)
                }
                href={isLiveGoogle ? null : undefined}
                onReviewsPress={
                  isLiveGoogle && googlePlaceId
                    ? () => void openGoogleReviews(googlePlaceId, r.name)
                    : undefined
                }
              />
            );
          })
        )}
      </View>

      {trending.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionTitles}>
            <Text style={styles.sectionTitle}>ÖNE ÇIKANLAR</Text>
            <Text style={styles.sectionSub}>Google popülerliği · yakınındaki 6 restoran</Text>
          </View>
          {trending.map((r, index) => {
            const isGoogleSource = r.source === 'google';
            const detailId = resolveRestaurantDetailId(r);
            const placeId = r.google_place_id ?? r.id;

            return (
              <RestaurantCard
                key={`t-${r.id}`}
                restaurant={r}
                rank={index + 1}
                href={isGoogleSource && !detailId ? null : undefined}
                googleRating={r.week_avg_rating ?? r.google_rating}
                googleReviewCount={r.google_user_ratings_total ?? r.google_review_count}
                distanceLabel={formatDistanceLabel(r)}
                cornerBadge={r.is_premium_partner ? 'ÖNE ÇIKAN' : undefined}
                onReviewsPress={
                  isGoogleSource && !detailId
                    ? () => void openGoogleReviews(placeId, r.name)
                    : undefined
                }
              />
            );
          })}
        </View>
      ) : null}

      <GoogleReviewsModal
        visible={reviewsOpen}
        title={reviewsTitle}
        loading={reviewsLoading}
        error={reviewsError}
        reviews={reviews}
        onClose={() => setReviewsOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 20 },
  hero: {
    ...GastroStyles.card,
    borderRadius: 20,
    padding: 18,
    gap: 6,
  },
  kicker: { color: GastroColors.accent, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  heroTitle: { color: GastroColors.text, fontSize: 22, fontWeight: '800' },
  heroSub: { color: GastroColors.muted, fontSize: 14, lineHeight: 20 },
  section: { gap: 4 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  sectionTitles: { gap: 2, flex: 1 },
  sectionTitle: {
    color: GastroColors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sectionSub: {
    color: GastroColors.muted,
    fontSize: 13,
  },
  count: { color: GastroColors.muted, fontSize: 13 },
  error: GastroStyles.errorText,
  empty: { color: GastroColors.muted, textAlign: 'center', padding: 24, lineHeight: 20 },
});
