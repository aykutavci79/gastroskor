import * as Location from 'expo-location';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { KesfetKitchenChips } from '@/components/KesfetKitchenChips';
import { KesfetHomeChrome } from '@/components/KesfetHomeChrome';
import { OnlineOrderEntryBanner } from '@/components/OnlineOrderEntryBanner';
import { RecentPhotosStrip } from '@/components/RecentPhotosStrip';
import { RegionalFlavorsEntryBanner } from '@/components/RegionalFlavorsEntryBanner';
import { RestaurantCard } from '@/components/RestaurantCard';
import { Screen } from '@/components/ui/Screen';
import { GastroColors, GastroStyles } from '@/constants/theme';
import { useCity } from '@/context/city-context';
import { searchLivePlaces } from '@/lib/api';
import { formatApiError } from '@/lib/format-api-error';
import {
  livePlaceDistanceLabel,
  livePlaceToRestaurantCard,
  sortLivePlacesByGastroScore,
} from '@/lib/live-place-card';
import { kitchenChipLabel, kitchenChipSearchQuery } from '@/lib/kesfet-kitchen-search';
import {
  consumePendingKesfetVoiceSearch,
  registerKesfetVoiceSearchListener,
  unregisterKesfetVoiceSearchListener,
} from '@/lib/kesfet-voice-bridge';
import { restaurantDetailHref } from '@/lib/uuid';
import { gastroSpeakVoiceSearchResults } from '@/lib/gastro-speak';
import { polishVoiceSearchTranscript } from '@/lib/voice-search-stt-fix';
import type {
  LivePlaceSearchItem,
  ParsedSearchIntent,
  RestaurantListItem,
} from '@/lib/types';

type Coords = { lat: number; lng: number };

export default function ExploreScreen() {
  const { city, cityLabel } = useCity();
  const navigation = useNavigation();
  const coordsRef = useRef<Coords | null>(null);
  const coordsUpdatedAtRef = useRef<number>(0);
  const scrollRef = useRef<ScrollView>(null);
  const searchInputRef = useRef<TextInput>(null);
  const voiceSearchAnnounceRef = useRef(false);

  const [inputQuery, setInputQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeKitchenSlug, setActiveKitchenSlug] = useState<string | null>(null);

  const [searchItems, setSearchItems] = useState<LivePlaceSearchItem[]>([]);
  const [searchCards, setSearchCards] = useState<RestaurantListItem[]>([]);
  const [liveParsed, setLiveParsed] = useState<ParsedSearchIntent | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedQuery = inputQuery.trim();
  const searchMode = trimmedQuery.length >= 2;

  const resetKesfetVitrin = useCallback(() => {
    Keyboard.dismiss();
    searchInputRef.current?.blur();
    setInputQuery('');
    setSearchFocused(false);
    setSearchItems([]);
    setSearchCards([]);
    setLiveParsed(null);
    setActiveKitchenSlug(null);
    setError(null);
  }, []);

  const kitchenBrowseMode = activeKitchenSlug != null && !searchMode;

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

  useEffect(() => {
    const unsub = navigation.addListener('tabPress', () => {
      if (!navigation.isFocused()) return;
      if (searchMode || searchFocused || kitchenBrowseMode) {
        resetKesfetVitrin();
      }
    });
    return unsub;
  }, [navigation, resetKesfetVitrin, searchFocused, searchMode, kitchenBrowseMode]);

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
    const q = polishVoiceSearchTranscript(query);
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
        city,
        limit: 20,
        origin_lat: coords?.lat,
        origin_lng: coords?.lng,
      });
      setSearchItems(result.items);
      setSearchCards(result.items.map(livePlaceToRestaurantCard));
      setLiveParsed(result.parsed);
      if (voiceSearchAnnounceRef.current) {
        voiceSearchAnnounceRef.current = false;
        gastroSpeakVoiceSearchResults(
          result.items.length,
          result.items.slice(0, 3).map((item) => ({
            name: item.name,
            rating: item.rating,
            distanceMeters: item.distance_meters,
          })),
        );
      }
    } catch (err) {
      setError(formatApiError(err, 'Arama'));
      setSearchItems([]);
      setSearchCards([]);
      if (voiceSearchAnnounceRef.current) {
        voiceSearchAnnounceRef.current = false;
        gastroSpeakVoiceSearchResults(0, []);
      }
    } finally {
      setLoadingSearch(false);
    }
  }, [refreshCoordsIfStale, ensureCoords, city]);

  const loadKitchenResults = useCallback(
    async (slug: string) => {
      const q = kitchenChipSearchQuery(slug);
      setLoadingSearch(true);
      setError(null);
      try {
        await refreshCoordsIfStale();
        const coords = (await ensureCoords()) ?? coordsRef.current;
        const result = await searchLivePlaces({
          q,
          city,
          limit: 20,
          origin_lat: coords?.lat,
          origin_lng: coords?.lng,
        });
        const sorted = sortLivePlacesByGastroScore(result.items);
        setSearchItems(sorted);
        setSearchCards(sorted.map(livePlaceToRestaurantCard));
        setLiveParsed(result.parsed);
      } catch (err) {
        setError(formatApiError(err, 'Mutfak araması'));
        setSearchItems([]);
        setSearchCards([]);
      } finally {
        setLoadingSearch(false);
      }
    },
    [refreshCoordsIfStale, ensureCoords, city],
  );

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      const polished = polishVoiceSearchTranscript(text);
      setInputQuery(polished);
      setSearchFocused(false);
      Keyboard.dismiss();
      searchInputRef.current?.blur();
      voiceSearchAnnounceRef.current = true;
      void loadSearchResults(polished);
    },
    [loadSearchResults],
  );

  useEffect(() => {
    registerKesfetVoiceSearchListener(handleVoiceTranscript);
    return () => unregisterKesfetVoiceSearchListener(handleVoiceTranscript);
  }, [handleVoiceTranscript]);

  useFocusEffect(
    useCallback(() => {
      const pending = consumePendingKesfetVoiceSearch();
      if (pending) handleVoiceTranscript(pending);
    }, [handleVoiceTranscript]),
  );

  useEffect(() => {
    if (searchMode) {
      setActiveKitchenSlug(null);
    }
  }, [searchMode]);

  useEffect(() => {
    if (searchMode && trimmedQuery.length >= 2) {
      void loadSearchResults(trimmedQuery);
    } else if (kitchenBrowseMode && activeKitchenSlug) {
      void loadKitchenResults(activeKitchenSlug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sehir degisince mevcut aramayi yenile
  }, [city]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchMode) {
        void loadSearchResults(inputQuery);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [inputQuery, loadSearchResults, searchMode]);

  useEffect(() => {
    if (!activeKitchenSlug || searchMode) return;
    void loadKitchenResults(activeKitchenSlug);
  }, [activeKitchenSlug, loadKitchenResults, searchMode]);

  async function onRefresh() {
    if (!searchMode && !kitchenBrowseMode) return;
    setRefreshing(true);
    if (kitchenBrowseMode && activeKitchenSlug) {
      await loadKitchenResults(activeKitchenSlug);
    } else {
      await loadSearchResults(trimmedQuery);
    }
    setRefreshing(false);
  }

  function dismissKeyboard() {
    Keyboard.dismiss();
    searchInputRef.current?.blur();
    setSearchFocused(false);
  }

  function handleKitchenSelect(slug: string) {
    dismissKeyboard();
    if (activeKitchenSlug === slug) {
      setActiveKitchenSlug(null);
      setSearchItems([]);
      setSearchCards([]);
      setLiveParsed(null);
      setError(null);
      return;
    }
    setInputQuery('');
    setActiveKitchenSlug(slug);
  }

  const listMode = searchMode || kitchenBrowseMode;

  const chrome = (
    <View style={styles.chromeWrap}>
      <KesfetHomeChrome
        query={inputQuery}
        onQueryChange={setInputQuery}
        onSearchFocus={() => setSearchFocused(true)}
        onSearchBlur={() => setSearchFocused(false)}
        onClear={resetKesfetVitrin}
        onDismiss={dismissKeyboard}
        searchInputRef={searchInputRef}
        searchFocused={searchFocused}
      />
    </View>
  );

  const searchBody = listMode ? (
    <View style={styles.searchBody}>
      {kitchenBrowseMode && activeKitchenSlug ? (
        <View style={styles.kitchenHeader}>
          <Text style={styles.kitchenTitle}>{kitchenChipLabel(activeKitchenSlug)}</Text>
          <Text style={styles.kitchenSub}>GastroSkor sıralı · {cityLabel}</Text>
        </View>
      ) : null}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}
      {loadingSearch ? (
        <ActivityIndicator color={GastroColors.accent} style={{ marginVertical: 16 }} />
      ) : searchCards.length === 0 ? (
        <Text style={styles.empty}>
          {kitchenBrowseMode && activeKitchenSlug
            ? `${kitchenChipLabel(activeKitchenSlug)} için sonuç bulunamadı.`
            : liveParsed?.min_rating != null
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
  ) : null;

  const vitrinBody = !listMode ? (
    <View style={styles.vitrinFill}>
        <View style={styles.flexOnline}>
          <OnlineOrderEntryBanner variant="vitrin" style={styles.fillChild} />
        </View>
        <View style={styles.flexRegional}>
          <RegionalFlavorsEntryBanner style={styles.fillChild} />
        </View>
        <RecentPhotosStrip style={styles.flexPhotos} onDismissKeyboard={dismissKeyboard} />
    </View>
  ) : null;

  const showVitrinDismissOverlay = searchFocused && !listMode;

  return (
    <Screen scroll={false} flush keyboardVerticalOffset={72} style={styles.page}>
      {chrome}
      <KesfetKitchenChips activeSlug={activeKitchenSlug} onSelect={handleKitchenSelect} />
      <View style={styles.bodyHost}>
        {listMode ? (
          <ScrollView
            ref={scrollRef}
            style={styles.searchScrollHost}
            contentContainerStyle={styles.searchScroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={GastroColors.accent}
              />
            }>
            {searchBody}
          </ScrollView>
        ) : (
          <View style={styles.vitrinTapArea}>{vitrinBody}</View>
        )}
        {showVitrinDismissOverlay ? (
          <Pressable
            style={styles.vitrinDismissOverlay}
            onPress={dismissKeyboard}
            accessibilityRole="button"
            accessibilityLabel="Klavyeyi kapat"
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  chromeWrap: {
    zIndex: 20,
    elevation: 20,
  },
  bodyHost: { flex: 1, minHeight: 0, position: 'relative' },
  searchScrollHost: { flex: 1 },
  vitrinTapArea: { flex: 1, minHeight: 0 },
  vitrinDismissOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 15,
    elevation: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
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
  kitchenHeader: { gap: 2, paddingHorizontal: 4, paddingTop: 4 },
  kitchenTitle: { color: GastroColors.text, fontSize: 17, fontWeight: '800' },
  kitchenSub: { color: GastroColors.muted, fontSize: 12, fontWeight: '600' },
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
