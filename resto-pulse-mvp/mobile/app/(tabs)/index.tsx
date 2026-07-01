import * as Location from 'expo-location';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import { useGastroPostHog } from '@/lib/gastro-posthog';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import type { KesfetSearchModel } from '@/components/KesfetSearchModelPicker';
import { OnlineOrderEntryBanner } from '@/components/OnlineOrderEntryBanner';
import { OnlineReservationEntryBanner } from '@/components/OnlineReservationEntryBanner';
import { RecentPhotosStrip } from '@/components/RecentPhotosStrip';
import { RegionalFlavorsEntryBanner } from '@/components/RegionalFlavorsEntryBanner';
import { RestaurantCard } from '@/components/RestaurantCard';
import { SocialProofScanBanner } from '@/components/SocialProofScanBanner';
import { SocialModeScreenHalo } from '@/components/SocialModeScreenHalo';
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
  socialItemEligible,
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
import {
  liveSearchAnalyticsProps,
  liveSearchSourceKey,
  liveSearchSourceHint,
  liveSearchSourceLabel,
} from '@/lib/live-search-source';
import { kitchenChipSearchQuery } from '@/lib/kesfet-kitchen-search';
import { useCategoryLabel } from '@/lib/use-category-label';
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
  const posthog = useGastroPostHog();
  const { city, cityLabel } = useCity();
  const { user } = useSession();
  const { colors } = useGastroTheme();
  const { t } = useTranslation();
  const getCategoryLabel = useCategoryLabel();
  const styles = useMemo(() => createExploreStyles(colors), [colors]);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
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
  const [searchModel, setSearchModel] = useState<KesfetSearchModel>('gastroskor');
  const [searchSource, setSearchSource] = useState<string | null>(null);
  const [vitrinViewportHeight, setVitrinViewportHeight] = useState(0);

  const canRunSocialMode = Boolean(user);
  const isSocialMode = searchModel === 'sosyal';
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
    setSearchSource(null);
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
    const nav = navigation as {
      addListener(event: 'tabPress', callback: () => void): () => void;
      isFocused(): boolean;
    };
    const unsub = nav.addListener('tabPress', () => {
      if (!nav.isFocused()) return;
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

  const applySocialToList = useCallback((baseItems: LivePlaceSearchItem[], index: SocialResultsIndex) => {
    if (!baseItems.length) return baseItems;
    return sortLivePlacesBySocialProof(baseItems, index);
  }, []);

  const runSocialLayer = useCallback(
    async (query: string, pollToken: number, baseItems: LivePlaceSearchItem[]) => {
      if (!canRunSocialMode) return;

      let overlay: SocialProofStatus | null = null;
      try {
        overlay = await getSocialOverlay({ query, city });
      } catch {
        overlay = null;
      }
      if (pollTokenRef.current !== pollToken) return;

      if (overlay?.status === 'ready' && overlay.results?.length) {
        const index = socialResultsIndex(overlay.results);
        setSocialStatus(overlay);
        setSocialByPlace(index);
        socialSortModeRef.current = true;
        setSocialSortActive(true);
        const ordered = applySocialToList(baseItems, index);
        setSearchItems(ordered);
        setSearchCards(ordered.map(livePlaceToRestaurantCard));
        return;
      }

      if (overlay) setSocialStatus(overlay);

      const needsScan =
        !overlay ||
        overlay.status === 'uncached' ||
        (overlay.status === 'insufficient_data' && overlay.can_scan);

      if (!needsScan) return;

      setSocialScanLoading(true);
      try {
        const { data: scanned } = await requestSocialScan({ query, city });
        if (pollTokenRef.current !== pollToken) return;
        setSocialStatus(scanned);
        if (scanned.results?.length) {
          const index = socialResultsIndex(scanned.results);
          setSocialByPlace(index);
          socialSortModeRef.current = true;
          setSocialSortActive(true);
          const ordered = applySocialToList(baseItems, index);
          setSearchItems(ordered);
          setSearchCards(ordered.map(livePlaceToRestaurantCard));
        }
        if (scanned.job_id && (scanned.status === 'scanning' || scanned.status === 'pending')) {
          socialSortModeRef.current = true;
          setSocialSortActive(true);
          pollSocialJob(scanned.job_id, pollToken);
        }
      } catch (err) {
        if (pollTokenRef.current !== pollToken) return;
        setError(formatApiError(err, 'Sosyal tarama'));
        setSocialStatus((prev) => (prev ? { ...prev, status: 'failed' } : { status: 'failed' }));
      } finally {
        setSocialScanLoading(false);
      }
    },
    [applySocialToList, canRunSocialMode, city, pollSocialJob],
  );

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
    setSearchSource(null);
    return;
    }

    const isVoiceSearch = voiceSearchAnnounceRef.current;
    const pollToken = pollTokenRef.current + 1;
    pollTokenRef.current = pollToken;

    setLoadingSearch(true);
    setError(null);
    setSocialStatus(null);
    setSocialByPlace(EMPTY_SOCIAL_INDEX);
    socialSortModeRef.current = false;
    setSocialSortActive(false);

    if (isSocialMode && !canRunSocialMode) {
      setLoadingSearch(false);
      setError(t('explore.socialLoginRequired'));
      return;
    }

    try {
      await refreshCoordsIfStale();
      const coords = (await ensureCoords()) ?? coordsRef.current;

      let itemsForVoice: LivePlaceSearchItem[] = [];

      const result = await searchLivePlaces({
        q,
        city,
        limit: isSocialMode ? 20 : 12,
        origin_lat: coords?.lat,
        origin_lng: coords?.lng,
      });

      itemsForVoice = result.items;
      setSearchItems(result.items);
      setSearchCards(result.items.map(livePlaceToRestaurantCard));
      setLiveParsed(result.parsed);
      setSearchSource(liveSearchSourceKey(result.filters_applied));

      if (isSocialMode && canRunSocialMode && pollTokenRef.current === pollToken) {
        await runSocialLayer(q, pollToken, result.items);
      }

      if (isVoiceSearch) {
        posthog.capture('voice_search_used', {
          ...liveSearchAnalyticsProps(result.filters_applied, {
            query: q,
            result_count: itemsForVoice.length,
            city,
          }),
          query_text: q,
          success: itemsForVoice.length > 0,
        });
      } else {
        posthog.capture(
          'restaurant_searched',
          liveSearchAnalyticsProps(result.filters_applied, {
            query: q,
            result_count: itemsForVoice.length,
            city,
          }),
        );
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
      setError(formatApiError(err, t('explore.searchLabel')));
      setSearchItems([]);
      setSearchCards([]);
      setSearchSource(null);
      if (isVoiceSearch) {
        posthog.capture('voice_search_used', { query_text: q, success: false });
      }
      if (voiceSearchAnnounceRef.current) {
        voiceSearchAnnounceRef.current = false;
        await ensureGastroPlaybackReady();
        gastroSpeakVoiceSearchResults(0, []);
      }
    } finally {
      setLoadingSearch(false);
    }
  }, [refreshCoordsIfStale, ensureCoords, city, pollSocialJob, posthog, isSocialMode, canRunSocialMode, runSocialLayer, t]);

  const switchToClassicSearch = useCallback(() => {
    setSearchModel('gastroskor');
    setError(null);
  }, []);

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
      posthog.capture('discover_search_used', {
        mode: 'trend',
        result_count: data.results?.length ?? 0,
      });
    } catch (err) {
      setError(formatApiError(err, 'Sosyal tarama'));
    } finally {
      setSocialScanLoading(false);
    }
  }, [city, pollSocialJob, socialScanLoading, posthog]);

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
        setSearchSource(liveSearchSourceKey(result.filters_applied));
        posthog.capture('discover_search_used', {
          ...liveSearchAnalyticsProps(result.filters_applied, {
            query: q,
            result_count: sorted.length,
            city,
          }),
          mode: 'best',
        });
      } catch (err) {
        setError(formatApiError(err, t('explore.kitchenSearchLabel')));
        setSearchItems([]);
        setSearchCards([]);
      } finally {
        setLoadingSearch(false);
      }
    },
    [refreshCoordsIfStale, ensureCoords, city, posthog, t],
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
    if (searchMode && trimmedQuery.length >= 2) {
      void loadSearchResults(trimmedQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- arama modeli degisince mevcut sorguyu yenile
  }, [searchModel]);

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

  function handleBodyHostLayout(event: { nativeEvent: { layout: { height: number } } }) {
    const next = Math.round(event.nativeEvent.layout.height);
    if (next > 0) setVitrinViewportHeight(next);
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
  const socialFinishedEmpty =
    isSocialMode &&
    searchMode &&
    !loadingSearch &&
    !socialScanLoading &&
    socialStatus != null &&
    socialStatus.status !== 'scanning' &&
    socialStatus.status !== 'pending' &&
    !socialSortActive;

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
        searchModel={searchModel}
        onSearchModelChange={setSearchModel}
        canRunSocial={canRunSocialMode}
      />
    </View>
  );

  const searchBody = listMode ? (
    <View style={styles.searchBody}>
      {kitchenBrowseMode && activeKitchenSlug ? (
        <View style={styles.kitchenHeader}>
          <Text style={styles.kitchenTitle}>{getCategoryLabel(activeKitchenSlug)}</Text>
          <Text style={styles.kitchenSub}>{t('explore.kitchenSorted', { city: cityLabel })}</Text>
        </View>
      ) : null}
      {isSocialMode && searchMode ? (
        <SocialProofScanBanner
          social={socialStatus}
          loggedIn={canRunSocialMode}
          scanLoading={socialScanLoading}
          socialSortActive={socialSortActive}
          onRequestScan={handleRequestSocialScan}
        />
      ) : null}
      {__DEV__ && searchSource && searchMode ? (
        <View style={styles.searchSourceDev}>
          <Text style={styles.searchSourceDevTitle}>
            Kaynak: {liveSearchSourceLabel(searchSource)}
          </Text>
          <Text style={styles.searchSourceDevHint}>{liveSearchSourceHint(searchSource)}</Text>
          <Text style={styles.searchSourceDevCode}>{searchSource}</Text>
        </View>
      ) : null}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}
      {loadingSearch ? (
        <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} />
      ) : searchCards.length === 0 ? (
        socialFinishedEmpty ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>{t('explore.socialEmpty')}</Text>
            <Text style={styles.empty}>{t('explore.socialEmptyHint')}</Text>
            <Pressable style={styles.fallbackBtn} onPress={switchToClassicSearch}>
              <Text style={styles.fallbackBtnText}>{t('explore.switchToClassic')}</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.empty}>
            {kitchenBrowseMode && activeKitchenSlug
              ? t('explore.kitchenEmpty', { kitchen: getCategoryLabel(activeKitchenSlug) })
              : liveParsed?.min_rating != null
                ? t('explore.ratingEmpty', { rating: liveParsed.min_rating })
                : t('explore.liveEmpty')}
          </Text>
        )
      ) : (
        searchCards.map((r, index) => {
          const liveItem = searchItems[index];
          const socialRow =
            liveItem && socialItemEligible(liveItem)
              ? lookupSocialResult(socialByPlace, liveItem)
              : undefined;
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
              cornerBadge={
                isSocialMode && socialSortActive ? socialBadgeLabel(socialRow?.badge) : undefined
              }
              href={detailHref}
            />
          );
        })
      )}
    </View>
  ) : null;

  const vitrinBody = !listMode ? (
    <ScrollView
      style={styles.vitrinScroll}
      contentContainerStyle={styles.vitrinScrollContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}>
      <View
        style={[
          styles.vitrinTripleHost,
          vitrinViewportHeight > 0 ? { minHeight: vitrinViewportHeight } : null,
        ]}>
        <View style={styles.vitrinThird}>
          <OnlineOrderEntryBanner variant="vitrin" style={styles.fillChild} />
        </View>
        <View style={styles.vitrinThird}>
          <OnlineReservationEntryBanner style={styles.fillChild} />
        </View>
        <View style={styles.vitrinThird}>
          <RegionalFlavorsEntryBanner style={styles.fillChild} />
        </View>
      </View>
      <RecentPhotosStrip style={styles.foodcastBelow} onDismissKeyboard={dismissKeyboard} />
    </ScrollView>
  ) : null;

  const showVitrinDismissOverlay = searchFocused && !listMode;

  const socialScanning =
    socialScanLoading ||
    socialStatus?.status === 'scanning' ||
    socialStatus?.status === 'pending';

  return (
    <Screen scroll={false} flush keyboardVerticalOffset={72} style={styles.page}>
      <View style={styles.pageInner}>
      {chrome}
      <KesfetKitchenChips activeSlug={activeKitchenSlug} onSelect={handleKitchenSelect} />
      <View style={styles.bodyHost} onLayout={handleBodyHostLayout}>
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
          vitrinBody
        )}
        {showVitrinDismissOverlay ? (
          <Pressable
            style={styles.vitrinDismissOverlay}
            onPress={dismissKeyboard}
            accessibilityRole="button"
            accessibilityLabel={t('explore.dismissKeyboard')}
          />
        ) : null}
      </View>
      <SocialModeScreenHalo
        active={isFocused && isSocialMode}
        intensify={socialScanning}
      />
      </View>
    </Screen>
  );
}

function createExploreStyles(colors: import('@/constants/theme').GastroColorScheme) {
  return StyleSheet.create({
  page: { flex: 1 },
  pageInner: { flex: 1, position: 'relative' },
  chromeWrap: {
    zIndex: 20,
    elevation: 20,
  },
  bodyHost: { flex: 1, minHeight: 0, position: 'relative' },
  searchScrollHost: { flex: 1 },
  vitrinScroll: { flex: 1 },
  vitrinScrollContent: { flexGrow: 1 },
  vitrinTripleHost: {
    flexDirection: 'column',
    gap: 3,
    paddingTop: 3,
  },
  vitrinThird: { flex: 1, minHeight: 0, paddingHorizontal: 12 },
  foodcastBelow: { flex: 0, flexGrow: 0, flexShrink: 0, paddingTop: 8, paddingBottom: 16 },
  vitrinDismissOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 15,
    elevation: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  fillChild: { flex: 1, marginHorizontal: 0, alignSelf: 'stretch', width: '100%' },
  searchScroll: { paddingHorizontal: 12, gap: 12, paddingBottom: 24 },
  searchBody: { gap: 12, paddingHorizontal: 4 },
  searchSourceDev: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.45)',
    backgroundColor: 'rgba(234, 179, 8, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
  searchSourceDevTitle: { color: colors.text, fontSize: 12, fontWeight: '800' },
  searchSourceDevHint: { color: colors.muted, fontSize: 11, lineHeight: 15 },
  searchSourceDevCode: { color: colors.muted, fontSize: 10, fontFamily: 'monospace' },
  kitchenHeader: { gap: 2, paddingHorizontal: 4, paddingTop: 4 },
  kitchenTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  kitchenSub: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  emptyBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: 16,
    gap: 8,
  },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  empty: { color: colors.muted, textAlign: 'center', lineHeight: 20 },
  fallbackBtn: {
    marginTop: 4,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  fallbackBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
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
