import * as Location from 'expo-location';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { SocialProofScanBanner } from '@/components/SocialProofScanBanner';
import { Screen } from '@/components/ui/Screen';
import { GastroStyles } from '@/constants/theme';
import { useCity } from '@/context/city-context';
import { useSession } from '@/context/session-context';
import { useGastroTheme } from '@/context/theme-context';
import { getDiscoverJob, getSocialOverlay, requestSocialScan, searchLivePlaces } from '@/lib/api';
import {
  lookupSocialResult,
  pollDiscoverSocialJob,
  socialBadgeLabel,
  sortLivePlacesBySocialProof,
  socialResultsIndex,
  type SocialResultsIndex,
} from '@/lib/discover-social';
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
import { gastroSpeakVoiceSearchResults, gastroStopSpeaking, ensureGastroPlaybackReady } from '@/lib/gastro-speak';
import { polishVoiceSearchTranscript } from '@/lib/voice-search-stt-fix';
import type {
  LivePlaceSearchItem,
  ParsedSearchIntent,
  RestaurantListItem,
  SocialProofStatus,
  SocialProofVenueResult,
} from '@/lib/types';

type Coords = { lat: number; lng: number };

const EMPTY_SOCIAL_INDEX: SocialResultsIndex = { byPlaceId: new Map(), byName: new Map() };

export default function ExploreScreen() {
  const { city, cityLabel } = useCity();
  const { user } = useSession();
  const { colors } = useGastroTheme();
  const styles = useMemo(() => createExploreStyles(colors), [colors]);
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
  const [socialStatus, setSocialStatus] = useState<SocialProofStatus | null>(null);
  const [socialByPlace, setSocialByPlace] = useState<SocialResultsIndex>({
    byPlaceId: new Map(),
    byName: new Map(),
  });
  const pollTokenRef = useRef(0);
  const lastSearchQueryRef = useRef('');
  const socialSortModeRef = useRef(false);
  const [socialScanLoading, setSocialScanLoading] = useState(false);
  const [socialSortActive, setSocialSortActive] = useState(false);

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
    setSocialStatus(null);
    setSocialByPlace(EMPTY_SOCIAL_INDEX);
    socialSortModeRef.current = false;
    setSocialSortActive(false);
    pollTokenRef.current += 1;
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

  const pollSocialJob = useCallback((jobId: string, pollToken: number) => {
    void pollDiscoverSocialJob(
      jobId,
      (tick) => {
        if (pollTokenRef.current !== pollToken) return;
        setSocialStatus(tick);
        if (tick.results?.length) {
          const index = socialResultsIndex(tick.results);
          setSocialByPlace(index);
          if (socialSortModeRef.current) {
            setSearchItems((prev) => {
              if (!prev.length) return prev;
              const ordered = sortLivePlacesBySocialProof(prev, index);
              setSearchCards(ordered.map(livePlaceToRestaurantCard));
              return ordered;
            });
          }
        }
      },
      async (id) => {
        const payload = await getDiscoverJob(id);
        return { social: payload.social, status: payload.status };
      },
    ).then((finalSocial) => {
      if (pollTokenRef.current !== pollToken) return;
      setSocialStatus(finalSocial);
      if (finalSocial.results?.length) {
        const index = socialResultsIndex(finalSocial.results);
        setSocialByPlace(index);
        if (socialSortModeRef.current) {
          setSearchItems((prev) => {
            if (!prev.length) return prev;
            const ordered = sortLivePlacesBySocialProof(prev, index);
            setSearchCards(ordered.map(livePlaceToRestaurantCard));
            return ordered;
          });
        }
      }
    });
  }, []);

  const loadSearchResults = useCallback(async (query: string) => {
    const q = polishVoiceSearchTranscript(query);
    lastSearchQueryRef.current = q;
    if (q.length < 2) {
      setSearchItems([]);
      setSearchCards([]);
      setLiveParsed(null);
      setError(null);
    setSocialStatus(null);
    setSocialByPlace(EMPTY_SOCIAL_INDEX);
    socialSortModeRef.current = false;
    setSocialSortActive(false);
    return;
    }

    const pollToken = pollTokenRef.current + 1;
    pollTokenRef.current = pollToken;

    setLoadingSearch(true);
    setError(null);
    setSocialStatus(null);
    setSocialByPlace(EMPTY_SOCIAL_INDEX);
    socialSortModeRef.current = false;
    setSocialSortActive(false);
    try {
      await refreshCoordsIfStale();
      const coords = (await ensureCoords()) ?? coordsRef.current;

      let itemsForVoice: LivePlaceSearchItem[] = [];

      const [result, socialOverlay] = await Promise.all([
        searchLivePlaces({
          q,
          city,
          limit: 20,
          origin_lat: coords?.lat,
          origin_lng: coords?.lng,
        }),
        getSocialOverlay({ query: q, city }).catch(() => null),
      ]);

      itemsForVoice = result.items;
      setSearchItems(result.items);
      setSearchCards(result.items.map(livePlaceToRestaurantCard));
      setLiveParsed(result.parsed);

      if (pollTokenRef.current === pollToken && socialOverlay) {
        setSocialStatus(socialOverlay);
        if (socialOverlay.results?.length) {
          setSocialByPlace(socialResultsIndex(socialOverlay.results));
        } else {
          setSocialByPlace(EMPTY_SOCIAL_INDEX);
        }
        if (
          socialOverlay.job_id &&
          (socialOverlay.status === 'scanning' || socialOverlay.status === 'pending')
        ) {
          pollSocialJob(socialOverlay.job_id, pollToken);
        }
      }

      if (voiceSearchAnnounceRef.current) {
        voiceSearchAnnounceRef.current = false;
        await ensureGastroPlaybackReady();
        gastroSpeakVoiceSearchResults(
          itemsForVoice.length,
          itemsForVoice.slice(0, 3).map((item) => ({
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
        await ensureGastroPlaybackReady();
        gastroSpeakVoiceSearchResults(0, []);
      }
    } finally {
      setLoadingSearch(false);
    }
  }, [refreshCoordsIfStale, ensureCoords, city, pollSocialJob]);

  const handleRequestSocialScan = useCallback(async () => {
    const q = lastSearchQueryRef.current.trim();
    if (q.length < 2 || socialScanLoading) return;
    const pollToken = pollTokenRef.current;
    socialSortModeRef.current = true;
    setSocialSortActive(true);
    setSocialScanLoading(true);
    setError(null);
    try {
      const { data } = await requestSocialScan({ query: q, city });
      if (pollTokenRef.current !== pollToken) return;
      setSocialStatus(data);
      if (data.job_id && (data.status === 'scanning' || data.status === 'pending')) {
        pollSocialJob(data.job_id, pollToken);
      } else if (data.results?.length) {
        const index = socialResultsIndex(data.results);
        setSocialByPlace(index);
        setSearchItems((prev) => {
          if (!prev.length) return prev;
          const ordered = sortLivePlacesBySocialProof(prev, index);
          setSearchCards(ordered.map(livePlaceToRestaurantCard));
          return ordered;
        });
      }
    } catch (err) {
      setError(formatApiError(err, 'Sosyal tarama'));
    } finally {
      setSocialScanLoading(false);
    }
  }, [city, pollSocialJob, socialScanLoading]);

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
      gastroStopSpeaking();
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
        onSearchFocus={() => {
          gastroStopSpeaking();
          setSearchFocused(true);
        }}
        onSearchBlur={() => setSearchFocused(false)}
        onClear={resetKesfetVitrin}
        onDismiss={dismissKeyboard}
        searchInputRef={searchInputRef}
        searchFocused={searchFocused}
        showReviewTicker={!listMode && !searchFocused}
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
      <SocialProofScanBanner
        social={socialStatus}
        loggedIn={Boolean(user)}
        scanLoading={socialScanLoading}
        socialSortActive={socialSortActive}
        onRequestScan={handleRequestSocialScan}
      />
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}
      {loadingSearch ? (
        <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} />
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
          const socialRow = liveItem ? lookupSocialResult(socialByPlace, liveItem) : undefined;
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
              cornerBadge={socialBadgeLabel(socialRow?.badge)}
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
                tintColor={colors.accent}
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

function createExploreStyles(colors: import('@/constants/theme').GastroColorScheme) {
  return StyleSheet.create({
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
  kitchenTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  kitchenSub: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  empty: { color: colors.muted, textAlign: 'center', padding: 20, lineHeight: 20 },
  errorBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
  },
  error: GastroStyles.errorText,
  });
}
