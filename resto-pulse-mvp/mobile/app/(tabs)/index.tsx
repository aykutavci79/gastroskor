import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { GoogleReviewsModal } from '@/components/GoogleReviewsModal';
import { RestaurantCard } from '@/components/RestaurantCard';
import { SearchBar } from '@/components/SearchBar';
import { Screen } from '@/components/ui/Screen';
import { GastroColors, GastroStyles } from '@/constants/theme';
import { getLivePlaceDetails, listRestaurants, listTrendingRestaurantsWeek } from '@/lib/api';
import { formatDistanceLabel } from '@/lib/travel-estimate';
import { resolveRestaurantDetailId } from '@/lib/uuid';
import type { LivePlaceReview, RestaurantListItem, RestaurantTrendingItem } from '@/lib/types';

export default function ExploreScreen() {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [restaurants, setRestaurants] = useState<RestaurantListItem[]>([]);
  const [trending, setTrending] = useState<RestaurantTrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [reviewsTitle, setReviewsTitle] = useState<string | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<LivePlaceReview[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const pos = await Location.getCurrentPositionAsync({});
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // Konum alinamazsa liste yine yuklenir
        }
      }
      const [list, trend] = await Promise.all([
        listRestaurants({ q: query.trim() || undefined, city: city.trim() || undefined }),
        listTrendingRestaurantsWeek({ lat, lng, city: city.trim() || undefined, limit: 6 }),
      ]);
      setRestaurants(list);
      setTrending(trend);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veri yuklenemedi');
    }
  }, [query, city]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
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

  return (
    <Screen scroll style={styles.page} refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>GastroSkor</Text>
        <Text style={styles.heroTitle}>Türkiye restoranlarını puanla</Text>
        <Text style={styles.heroSub}>
          Şehir ve isimle ara; üye işletmelerde menü, rozetler ve altın çerçeve.
        </Text>
      </View>

      <SearchBar query={query} city={city} onQueryChange={setQuery} onCityChange={setCity} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionTitles}>
            <Text style={styles.sectionTitle}>Restoranlar</Text>
            <Text style={styles.sectionSub}>Arama sonuçları</Text>
          </View>
          <Text style={styles.count}>{restaurants.length} sonuç</Text>
        </View>
        {loading ? (
          <ActivityIndicator color={GastroColors.accent} style={{ marginVertical: 16 }} />
        ) : restaurants.length === 0 ? (
          <Text style={styles.empty}>Sonuç bulunamadı.</Text>
        ) : (
          restaurants.map((r) => (
            <RestaurantCard
              key={r.id}
              restaurant={r}
              googleRating={r.google_rating}
              googleReviewCount={r.google_review_count}
              distanceLabel={formatDistanceLabel(r)}
            />
          ))
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
  empty: { color: GastroColors.muted, textAlign: 'center', padding: 24 },
});
