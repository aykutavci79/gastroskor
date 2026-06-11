import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FeaturedHighlightsSection } from '@/components/FeaturedHighlightsSection';
import { OnlineOrderEntryBanner } from '@/components/OnlineOrderEntryBanner';
import { RegionalFlavorsHomeSection } from '@/components/RegionalFlavorsHomeSection';
import { RestaurantCard } from '@/components/RestaurantCard';
import { SearchBar } from '@/components/SearchBar';
import { SloganBanner } from '@/components/SloganBanner';
import { TabScreenHeader } from '@/components/TabScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { GastroColors, GastroStyles } from '@/constants/theme';
import { useKeyboardFieldFocus } from '@/hooks/use-keyboard-field-focus';
import { listRestaurants, searchLivePlaces } from '@/lib/api';
import {
  livePlaceDistanceLabel,
  livePlaceToRestaurantCard,
} from '@/lib/live-place-card';
import { restaurantDetailHref } from '@/lib/uuid';
import { formatApiError } from '@/lib/format-api-error';
import type {
  LivePlaceSearchItem,
  ParsedSearchIntent,
  RestaurantListItem,
} from '@/lib/types';

type Coords = { lat: number; lng: number };

const SECTION_GAP = 24;

export default function ExploreScreen() {
  const coordsRef = useRef<Coords | null>(null);
  const coordsUpdatedAtRef = useRef<number>(0);
  const scrollRef = useRef<ScrollView>(null);
  const searchSectionY = useRef(0);
  const onFieldFocus = useKeyboardFieldFocus(scrollRef);
  const [inputQuery, setInputQuery] = useState('');
  const [inputCity, setInputCity] = useState('Bursa');
  const [activeQuery, setActiveQuery] = useState('');
  const [activeCity, setActiveCity] = useState('Bursa');

  const [dbRestaurants, setDbRestaurants] = useState<RestaurantListItem[]>([]);
  const [searchItems, setSearchItems] = useState<LivePlaceSearchItem[]>([]);
  const [searchCards, setSearchCards] = useState<RestaurantListItem[]>([]);
  const [liveParsed, setLiveParsed] = useState<ParsedSearchIntent | null>(null);
  const [hasActiveSearch, setHasActiveSearch] = useState(false);

  const [loadingDb, setLoadingDb] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const pos = await Location.getCurrentPositionAsync({});
        if (!cancelled) {
          coordsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          coordsUpdatedAtRef.current = Date.now();
        }
      } catch {
        /* Konum opsiyonel — DB listesi icin */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ensureCoords = useCallback(async (): Promise<Coords | null> => {
    if (coordsRef.current) return coordsRef.current;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const pos = await Location.getCurrentPositionAsync({});
      const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      coordsRef.current = next;
      coordsUpdatedAtRef.current = Date.now();
      return next;
    } catch {
      return null;
    }
  }, []);

  const refreshCoordsIfStale = useCallback(async () => {
    const staleMs = 2 * 60 * 1000;
    if (Date.now() - coordsUpdatedAtRef.current < staleMs) return;
    await ensureCoords();
  }, [ensureCoords]);

  const loadDbRestaurants = useCallback(async (city: string) => {
    await refreshCoordsIfStale();
    const coords = (await ensureCoords()) ?? coordsRef.current;
    const list = await listRestaurants({
      city: city.trim() || 'Bursa',
      origin_lat: coords?.lat,
      origin_lng: coords?.lng,
    });
    setDbRestaurants(list);
  }, [refreshCoordsIfStale, ensureCoords]);

  const loadSearchResults = useCallback(async (query: string, city: string) => {
    const q = query.trim();
    if (q.length < 2) {
      setHasActiveSearch(false);
      setSearchItems([]);
      setSearchCards([]);
      setLiveParsed(null);
      return;
    }

    setLoadingSearch(true);
    setError(null);
    try {
      await refreshCoordsIfStale();
      const coords = (await ensureCoords()) ?? coordsRef.current;
      const result = await searchLivePlaces({
        q,
        city: city.trim() || 'Bursa',
        limit: 20,
        origin_lat: coords?.lat,
        origin_lng: coords?.lng,
      });
      setSearchItems(result.items);
      setSearchCards(result.items.map(livePlaceToRestaurantCard));
      setLiveParsed(result.parsed);
      setHasActiveSearch(true);
    } catch (err) {
      setError(formatApiError(err, 'Arama'));
      setSearchItems([]);
      setSearchCards([]);
      setHasActiveSearch(true);
    } finally {
      setLoadingSearch(false);
    }
  }, [refreshCoordsIfStale, ensureCoords]);

  const loadAll = useCallback(async () => {
    await Promise.all([
      loadDbRestaurants(activeCity).catch(() => setDbRestaurants([])),
      loadSearchResults(activeQuery, activeCity),
    ]);
  }, [activeCity, activeQuery, loadDbRestaurants, loadSearchResults]);

  useEffect(() => {
    setLoadingDb(true);
    loadDbRestaurants(activeCity).finally(() => setLoadingDb(false));
  }, [activeCity, loadDbRestaurants]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadSearchResults(inputQuery, inputCity);
    }, 500);
    return () => clearTimeout(timer);
  }, [inputQuery, inputCity, loadSearchResults]);

  useEffect(() => {
    setActiveQuery(inputQuery.trim());
    setActiveCity(inputCity.trim() || 'Bursa');
  }, [inputQuery, inputCity]);

  function commitSearch() {
    setActiveQuery(inputQuery.trim());
    setActiveCity(inputCity.trim() || 'Bursa');
    void loadSearchResults(inputQuery, inputCity);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }

  return (
    <Screen
      scroll
      scrollRef={scrollRef}
      keyboardVerticalOffset={72}
      style={styles.page}
      refreshing={refreshing}
      onRefresh={onRefresh}>
      <TabScreenHeader
        title="Keşfet"
        subtitle="Yakınındaki lezzetleri ara ve kesfet."
        showBrandMark
        showDmAvatar
      />

      <OnlineOrderEntryBanner />

      <FeaturedHighlightsSection />

      <SloganBanner />

      <RegionalFlavorsHomeSection />

      <View
        style={styles.searchSection}
        onLayout={(event) => {
          searchSectionY.current = event.nativeEvent.layout.y;
        }}>
        <Text style={styles.sectionTitle}>Canlı arama</Text>
        <Text style={styles.sectionSub}>Google Haritalar ile anlık mekan araması</Text>
        <SearchBar
          query={inputQuery}
          city={inputCity}
          onQueryChange={setInputQuery}
          onCityChange={setInputCity}
          onSearch={commitSearch}
          searching={loadingSearch}
          onInputFocus={() => onFieldFocus(searchSectionY.current, 48)}
        />
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}
      </View>

      {hasActiveSearch && activeQuery.length >= 2 ? (
        <View style={styles.section}>
          <View style={styles.sectionTitles}>
            <Text style={styles.sectionTitle}>Arama sonuçları</Text>
            <Text style={styles.sectionSub}>
              Google canlı arama · &quot;{activeQuery}&quot;
            </Text>
          </View>
          {loadingSearch ? (
            <ActivityIndicator color={GastroColors.accent} style={{ marginVertical: 16 }} />
          ) : searchCards.length === 0 ? (
            <Text style={styles.empty}>
              {liveParsed?.min_rating != null
                ? `${liveParsed.min_rating}+ yıldıza uyan sonuç yok. Farklı kelime deneyin.`
                : 'Canlı aramada sonuç bulunamadı.'}
            </Text>
          ) : (
            searchCards.map((r, index) => {
              const liveItem = searchItems[index];
              const detailHref = restaurantDetailHref({
                id: r.id,
                restaurant_id: r.restaurant_id,
                google_place_id: liveItem?.place_id ?? r.google_place_id ?? null,
                liveScores: liveItem
                  ? {
                      gastro_score: liveItem.gastro_score,
                      distance_score: liveItem.distance_score,
                      rating_score: liveItem.rating_score,
                      distance_meters: liveItem.distance_meters,
                      distance_origin: liveItem.distance_origin,
                      rating: liveItem.rating,
                    }
                  : null,
              });
              return (
                <RestaurantCard
                  key={`search-${r.id}-${index}`}
                  restaurant={r}
                  googleRating={r.google_rating}
                  googleReviewCount={r.google_review_count}
                  distanceLabel={liveItem ? livePlaceDistanceLabel(liveItem) : undefined}
                  href={detailHref}
                />
              );
            })
          )}
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionTitles}>
          <Text style={styles.sectionTitle}>Kayıtlı restoranlar</Text>
          <Text style={styles.sectionSub}>GastroSkor veritabanı · üye ve yorumlu mekanlar</Text>
        </View>
        {loadingDb ? (
          <ActivityIndicator color={GastroColors.accent} style={{ marginVertical: 16 }} />
        ) : dbRestaurants.length === 0 ? (
          <Text style={styles.empty}>Kayıtlı restoran bulunamadı.</Text>
        ) : (
          dbRestaurants.map((r, index) => {
            const detailHref = restaurantDetailHref({
              id: r.id,
              restaurant_id: r.restaurant_id,
              google_place_id: r.google_place_id,
            });
            return (
              <RestaurantCard
                key={`db-${r.id}-${index}`}
                restaurant={r}
                googleRating={r.google_rating}
                googleReviewCount={r.google_review_count}
                href={detailHref}
              />
            );
          })
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: SECTION_GAP },
  section: { gap: 8 },
  searchSection: { gap: 10 },
  sectionTitles: { gap: 4 },
  sectionTitle: {
    color: GastroColors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  sectionSub: {
    color: GastroColors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  empty: { color: GastroColors.muted, textAlign: 'center', padding: 20, lineHeight: 20 },
  errorBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
  },
  error: GastroStyles.errorText,
});
