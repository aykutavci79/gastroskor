import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { RestaurantCard } from '@/components/RestaurantCard';
import { SearchBar } from '@/components/SearchBar';
import { Screen } from '@/components/ui/Screen';
import { GastroColors, GastroStyles } from '@/constants/theme';
import { listRestaurants, listTrendingRestaurantsWeek } from '@/lib/api';
import type { RestaurantListItem, RestaurantTrendingItem } from '@/lib/types';

export default function ExploreScreen() {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [restaurants, setRestaurants] = useState<RestaurantListItem[]>([]);
  const [trending, setTrending] = useState<RestaurantTrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({});
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
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

  return (
    <Screen scroll style={styles.gap} refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>GastroSkor</Text>
        <Text style={styles.title}>Turkiye restoranlarini puanla</Text>
        <Text style={styles.sub}>
          Sehir ve isimle ara; uye isletmelerde menu, rozetler ve altin cerceve.
        </Text>
      </View>

      <SearchBar query={query} city={city} onQueryChange={setQuery} onCityChange={setCity} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Restoranlar</Text>
          <Text style={styles.count}>{restaurants.length} sonuc</Text>
        </View>
        {loading ? (
          <ActivityIndicator color={GastroColors.accent} />
        ) : restaurants.length === 0 ? (
          <Text style={styles.empty}>Sonuc bulunamadi.</Text>
        ) : (
          restaurants.map((r) => <RestaurantCard key={r.id} restaurant={r} />)
        )}
      </View>

      {trending.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>One cikanlar</Text>
          <Text style={styles.sectionSub}>Google populerligi · sayfa sonu</Text>
          {trending.map((r) => (
            <RestaurantCard key={`t-${r.id}`} restaurant={r} />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 16 },
  hero: {
    ...GastroStyles.card,
    borderRadius: 20,
    padding: 18,
    gap: 6,
  },
  kicker: { color: GastroColors.accent, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  title: { color: GastroColors.text, fontSize: 22, fontWeight: '800' },
  sub: { color: GastroColors.muted, fontSize: 14, lineHeight: 20 },
  section: { gap: 10 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: GastroColors.text, fontSize: 18, fontWeight: '700' },
  sectionSub: { color: GastroColors.muted, fontSize: 12, marginTop: -6 },
  count: { color: GastroColors.muted, fontSize: 13 },
  error: GastroStyles.errorText,
  empty: { color: GastroColors.muted, textAlign: 'center', padding: 24 },
});
