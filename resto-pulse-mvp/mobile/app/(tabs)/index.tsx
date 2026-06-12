import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { KesfetFilterChips, type KesfetChipId } from '@/components/KesfetFilterChips';
import { KesfetHomeChrome } from '@/components/KesfetHomeChrome';
import { KesfetVoiceSearchSheet } from '@/components/KesfetVoiceSearchSheet';
import { OnlineOrderEntryBanner } from '@/components/OnlineOrderEntryBanner';
import { RecentPhotosStrip } from '@/components/RecentPhotosStrip';
import { RegionalFlavorsEntryBanner } from '@/components/RegionalFlavorsEntryBanner';
import { RestaurantCard } from '@/components/RestaurantCard';
import { Screen } from '@/components/ui/Screen';
import { GastroColors, GastroStyles } from '@/constants/theme';
import { searchLivePlaces } from '@/lib/api';
import { formatApiError } from '@/lib/format-api-error';
import {
  livePlaceDistanceLabel,
  livePlaceToRestaurantCard,
} from '@/lib/live-place-card';
import { registerKesfetVoiceOpener, unregisterKesfetVoiceOpener } from '@/lib/kesfet-voice-bridge';
import { restaurantDetailHref } from '@/lib/uuid';
import type {
  LivePlaceSearchItem,
  ParsedSearchIntent,
  RestaurantListItem,
} from '@/lib/types';

type Coords = { lat: number; lng: number };

const SEARCH_CITY = 'Bursa';

export default function ExploreScreen() {
  const router = useRouter();
  const coordsRef = useRef<Coords | null>(null);
  const coordsUpdatedAtRef = useRef<number>(0);
  const scrollRef = useRef<ScrollView>(null);

  const [inputQuery, setInputQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [activeChip, setActiveChip] = useState<KesfetChipId>('en-iyi');

  const [searchItems, setSearchItems] = useState<LivePlaceSearchItem[]>([]);
  const [searchCards, setSearchCards] = useState<RestaurantListItem[]>([]);
  const [liveParsed, setLiveParsed] = useState<ParsedSearchIntent | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedQuery = inputQuery.trim();
  const searchMode = trimmedQuery.length >= 2;

  useEffect(() => {
    const openVoice = () => setVoiceOpen(true);
    registerKesfetVoiceOpener(openVoice);
    return () => unregisterKesfetVoiceOpener(openVoice);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const pos = await Location.getCurrentPositionAsync({});
        if (!cancelled) {
          coordsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          coordsUpdatedAtRef.current = Date.now();
        }
      } catch {
        /* konum opsiyonel */
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

  const loadSearchResults = useCallback(async (query: string) => {
    const q = query.trim();
    if (q.length < 2) {
      setSearchItems([]);
      setSearchCards([]);
      setLiveParsed(null);
      setError(null);
      return;
    }

    setLoadingSearch(true);
    setError(null);
    try {
      await refreshCoordsIfStale();
      const coords = (await ensureCoords()) ?? coordsRef.current;
      const result = await searchLivePlaces({
        q,
        city: SEARCH_CITY,
        limit: 20,
        origin_lat: coords?.lat,
        origin_lng: coords?.lng,
      });
      setSearchItems(result.items);
      setSearchCards(result.items.map(livePlaceToRestaurantCard));
      setLiveParsed(result.parsed);
    } catch (err) {
      setError(formatApiError(err, 'Arama'));
      setSearchItems([]);
      setSearchCards([]);
    } finally {
      setLoadingSearch(false);
    }
  }, [refreshCoordsIfStale, ensureCoords]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadSearchResults(inputQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [inputQuery, loadSearchResults]);

  async function onRefresh() {
    if (!searchMode) return;
    setRefreshing(true);
    await loadSearchResults(trimmedQuery);
    setRefreshing(false);
  }

  function handleChipChange(chip: KesfetChipId) {
    setActiveChip(chip);
    if (chip === 'online') {
      router.push('/siparis-acik' as never);
      return;
    }
    if (chip === 'tescilli') {
      router.push('/yoresel' as never);
    }
  }

  function handleVoiceTranscript(text: string) {
    setInputQuery(text);
    setSearchFocused(true);
    void loadSearchResults(text);
  }

  const chrome = (
    <KesfetHomeChrome
      city={`${SEARCH_CITY}, TR`}
      query={inputQuery}
      onQueryChange={setInputQuery}
      onSearchFocus={() => setSearchFocused(true)}
      searchFocused={searchFocused}
    />
  );

  if (searchMode) {
    return (
      <Screen
        scroll
        flush
        scrollRef={scrollRef}
        keyboardVerticalOffset={72}
        refreshing={refreshing}
        onRefresh={onRefresh}
        style={styles.searchScroll}>
        {chrome}
        <View style={styles.searchBody}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}
          {loadingSearch ? (
            <ActivityIndicator color={GastroColors.accent} style={{ marginVertical: 16 }} />
          ) : searchCards.length === 0 ? (
            <Text style={styles.empty}>
              {liveParsed?.min_rating != null
                ? `${liveParsed.min_rating}+ yıldıza uyan sonuç yok.`
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
        <KesfetVoiceSearchSheet
          visible={voiceOpen}
          onClose={() => setVoiceOpen(false)}
          onTranscript={handleVoiceTranscript}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} flush style={styles.vitrinPage}>
      {chrome}
      <KesfetFilterChips active={activeChip} onChange={handleChipChange} />
      <View style={styles.vitrinFill}>
        <View style={styles.flexOnline}>
          <OnlineOrderEntryBanner variant="vitrin" style={styles.fillChild} />
        </View>
        <View style={styles.flexRegional}>
          <RegionalFlavorsEntryBanner style={styles.fillChild} />
        </View>
        <RecentPhotosStrip style={styles.flexPhotos} />
      </View>
      <KesfetVoiceSearchSheet
        visible={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onTranscript={handleVoiceTranscript}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  vitrinPage: { flex: 1 },
  vitrinFill: {
    flex: 1,
    minHeight: 0,
    paddingTop: 3,
    gap: 3,
  },
  flexOnline: { flex: 1.15, minHeight: 0, paddingHorizontal: 12 },
  flexRegional: { flex: 1, minHeight: 0, paddingHorizontal: 12 },
  flexPhotos: { flex: 1, minHeight: 0, marginBottom: 4 },
  fillChild: { flex: 1, marginHorizontal: 0, alignSelf: 'stretch', width: '100%' },
  searchScroll: { paddingHorizontal: 12, gap: 12, paddingBottom: 24 },
  searchBody: { gap: 12, paddingHorizontal: 4 },
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
