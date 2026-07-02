import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ONLINE_ORDER_MIN_RATING } from '@/constants/online-orders';
import { useCity } from '@/context/city-context';
import { useSession } from '@/context/session-context';
import { listOnlineOrderRestaurants } from '@/lib/api';
import { readStoredDeliveryAddress } from '@/lib/delivery-address-storage';
import { resolveDeviceCoords } from '@/lib/device-location';
import {
  ensureGastroPlaybackReady,
  gastroSpeakNoResults,
  gastroSpeakRetry,
  gastroSpeakSmartCartProposal,
  gastroSpeakVoiceOrderRestaurantOptions,
  gastroStopSpeaking,
} from '@/lib/gastro-speak';
import { filterOnlineOrderRestaurants } from '@/lib/online-order-filter';
import type { OnlineOrderResultsParams } from '@/lib/online-order-results-route';
import { fetchVoiceProductRestaurants } from '@/lib/online-order-voice-fetch';
import {
  sortOnlineOrderRestaurants,
  type OnlineOrderSortMode,
} from '@/lib/online-order-sort';
import type { VoiceOrderCommand } from '@/lib/parse-voice-order-command';
import { parseVoiceOrderCommand } from '@/lib/parse-voice-order-command';
import {
  parseVoiceOrderQuery,
  shouldShowVoiceProductPrice,
  type VoiceOrderQuery,
} from '@/lib/parse-voice-order-query';
import {
  enrichVoiceOrderCommandWithCandidate,
  isSmartCartCommand,
  pickBestSmartCartCandidate,
  smartCartProductGroups,
} from '@/lib/smart-voice-cart';
import type { RestaurantListItem, VoiceMenuMatch } from '@/lib/types';
import { buildVoiceOrderRestaurantOptions } from '@/lib/voice-order-letters';

const DEFAULT_DISTANCE_KM = 5;
const FILTER_DEBOUNCE_MS = 400;

export type OnlineOrderListMode = 'browse' | 'voice';

function voiceQueryFromParams(
  params: Extract<OnlineOrderResultsParams, { mode: 'voice' }>,
): VoiceOrderQuery {
  if (params.voiceText) {
    const parsed = parseVoiceOrderQuery(params.voiceText);
    if (parsed.voiceProduct || parsed.isCartOrder) return parsed;
  }
  return {
    rawText: params.voiceText ?? params.voiceProduct ?? '',
    voiceProduct: params.voiceProduct,
    voiceProductLabel: null,
    priceMax: params.priceMax,
    priceMaxBudget: params.priceMaxBudget ?? null,
    isCartOrder: false,
    cartLines: [],
    maxDistanceKm: params.maxDistanceKm,
    minRating: params.minRating ?? null,
    confidence: 'high',
    issues: [],
  };
}

export function useOnlineOrderListScreen() {
  const { city, fallbackCoords } = useCity();
  const { user } = useSession();
  const viewerEmail = user?.email?.trim().toLowerCase() || undefined;

  const [listMode, setListMode] = useState<OnlineOrderListMode>('browse');
  const [slugs, setSlugsState] = useState<string[]>([]);
  const [maxDistanceKm, setMaxDistanceKmState] = useState(DEFAULT_DISTANCE_KM);
  const [minRating, setMinRatingState] = useState(ONLINE_ORDER_MIN_RATING);
  const [sortMode, setSortMode] = useState<OnlineOrderSortMode>('gastro_score');

  const [allItems, setAllItems] = useState<RestaurantListItem[]>([]);
  const [voiceQuery, setVoiceQuery] = useState<VoiceOrderQuery | null>(null);
  const [voiceSearchExpanded, setVoiceSearchExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [usingFallbackCoords, setUsingFallbackCoords] = useState(false);

  const [voiceSheetOpen, setVoiceSheetOpen] = useState(false);
  const [voiceSearching, setVoiceSearching] = useState(false);
  const [voiceOrderCommand, setVoiceOrderCommand] = useState<VoiceOrderCommand | null>(null);
  const [voiceConfirmOpen, setVoiceConfirmOpen] = useState(false);
  const [voiceConfirmRestaurant, setVoiceConfirmRestaurant] = useState<RestaurantListItem | null>(
    null,
  );
  const [voiceCommandOpen, setVoiceCommandOpen] = useState(false);
  const [voiceCartSelections, setVoiceCartSelections] = useState<Record<number, VoiceMenuMatch>>({});

  const browseFetchGenRef = useRef(0);
  const voiceFetchGenRef = useRef(0);
  const sortRefetchSkipRef = useRef(true);
  const [browseRetryToken, setBrowseRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const resolved = await resolveDeviceCoords({ requestPermission: true, timeoutMs: 12_000 });
      if (cancelled) return;
      setUsingFallbackCoords(!resolved);
      const next = resolved ?? fallbackCoords;
      setCoords((prev) =>
        prev?.lat === next.lat && prev?.lng === next.lng ? prev : next,
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [fallbackCoords.lat, fallbackCoords.lng]);

  useEffect(() => {
    void readStoredDeliveryAddress()
      .then((stored) => {
        if (stored) setDestCoords({ lat: stored.latitude, lng: stored.longitude });
      })
      .catch(() => undefined);
  }, []);

  const exitVoiceMode = useCallback(() => {
    gastroStopSpeaking();
    setListMode('browse');
    setVoiceQuery(null);
    setVoiceCommandOpen(false);
    setVoiceConfirmOpen(false);
    setVoiceSearchExpanded(false);
  }, []);

  const setSlugs = useCallback(
    (next: string[] | ((prev: string[]) => string[])) => {
      setListMode((mode) => {
        if (mode === 'voice') {
          setVoiceQuery(null);
          return 'browse';
        }
        return mode;
      });
      setSlugsState(next);
    },
    [],
  );

  const setMaxDistanceKm = useCallback((km: number) => {
    setListMode((mode) => {
      if (mode === 'voice') {
        setVoiceQuery(null);
        return 'browse';
      }
      return mode;
    });
    setMaxDistanceKmState(km);
  }, []);

  const setMinRating = useCallback((rating: number) => {
    setListMode((mode) => {
      if (mode === 'voice') {
        setVoiceQuery(null);
        return 'browse';
      }
      return mode;
    });
    setMinRatingState(rating);
  }, []);

  const reloadBrowse = useCallback(() => {
    setBrowseRetryToken((token) => token + 1);
  }, []);

  const runVoiceFetch = useCallback(
    async (query: VoiceOrderQuery, sort: OnlineOrderSortMode, minRatingForFetch: number) => {
      if (coords == null) return;
      const gen = ++voiceFetchGenRef.current;
      setLoading(true);
      setError(null);
      setVoiceSearchExpanded(false);

      try {
        const cartGroups = query.isCartOrder
          ? [...new Set(query.cartLines.map((row) => row.productSearchGroup))]
          : [];
        const { response: res, expandedSearch } = await fetchVoiceProductRestaurants({
          origin_lat: coords.lat,
          origin_lng: coords.lng,
          city,
          sort,
          limit: 50,
          min_rating: minRatingForFetch,
          voice_product: query.isCartOrder ? undefined : query.voiceProduct ?? undefined,
          voice_products: query.isCartOrder && cartGroups.length ? cartGroups.join(',') : undefined,
          price_max: query.isCartOrder ? undefined : (query.priceMax ?? undefined),
          max_distance_km: query.maxDistanceKm ?? undefined,
          user_email: viewerEmail,
          dest_lat: destCoords?.lat,
          dest_lng: destCoords?.lng,
        });
        if (gen !== voiceFetchGenRef.current) return;
        setVoiceSearchExpanded(expandedSearch);
        const resultItems = Array.isArray(res.items) ? res.items : [];
        setAllItems(resultItems);

        await ensureGastroPlaybackReady();

        if (query.isCartOrder) {
          const command = parseVoiceOrderCommand(query.rawText, [], null);
          const options = buildVoiceOrderRestaurantOptions(
            resultItems.map((row) => ({ id: row.id, name: row.name })),
            8,
          );
          const candidate = pickBestSmartCartCandidate(resultItems, command, options);
          if (!candidate) {
            gastroSpeakNoResults(() => setVoiceCommandOpen(true));
            return;
          }
          const enriched = enrichVoiceOrderCommandWithCandidate(command, candidate);
          const restaurant = resultItems[candidate.restaurantIndex];
          if (!restaurant) {
            setVoiceCommandOpen(true);
            return;
          }
          setVoiceCartSelections(candidate.selectedByLine);
          setVoiceOrderCommand(enriched);
          setVoiceConfirmRestaurant(restaurant);
          gastroSpeakSmartCartProposal(
            {
              letter: candidate.letter,
              restaurantName: candidate.restaurantName,
              lines: candidate.lines.map((row) => ({
                quantity: row.intent.quantity,
                label: row.match.label,
                unitPriceTl: row.match.price_tl,
                lineTotalTl: row.lineTotal,
              })),
              orderTotal: candidate.orderTotal,
              budgetMax: command.priceMaxBudget,
            },
            () => setVoiceConfirmOpen(true),
          );
          return;
        }

        if (resultItems.length > 0) {
          const speechOptions = buildVoiceOrderRestaurantOptions(
            resultItems.map((row) => ({ id: row.id, name: row.name })),
            8,
          ).map((option) => {
            const row = resultItems.find((item) => item.id === option.id);
            const firstMatch = row?.voice_menu_matches?.[0];
            const priceHint = firstMatch
              ? `${firstMatch.label} ${Math.round(firstMatch.price_tl)} lira`
              : null;
            return { letter: option.letter, name: option.name, priceHint };
          });
          gastroSpeakVoiceOrderRestaurantOptions(speechOptions, () => {
            setVoiceCommandOpen(true);
          });
        }
      } catch (err) {
        if (gen !== voiceFetchGenRef.current) return;
        setError(err instanceof Error ? err.message : 'Sesli arama basarisiz');
        setAllItems([]);
      } finally {
        if (gen === voiceFetchGenRef.current) {
          setLoading(false);
          setVoiceSearching(false);
        }
      }
    },
    [coords, city, viewerEmail],
  );

  useEffect(() => {
    if (listMode !== 'browse' || coords == null) return;

    const timer = setTimeout(() => {
      const gen = ++browseFetchGenRef.current;
      setLoading(true);
      setError(null);

      void (async () => {
        try {
          const res = await listOnlineOrderRestaurants({
            origin_lat: coords.lat,
            origin_lng: coords.lng,
            city,
            sort: 'gastro_score',
            limit: 50,
            min_rating: minRating,
            user_email: viewerEmail,
            dest_lat: destCoords?.lat,
            dest_lng: destCoords?.lng,
          });
          if (gen !== browseFetchGenRef.current) return;
          setAllItems(Array.isArray(res.items) ? res.items : []);
        } catch (err) {
          if (gen !== browseFetchGenRef.current) return;
          setError(err instanceof Error ? err.message : 'Liste yuklenemedi');
          setAllItems([]);
        } finally {
          if (gen === browseFetchGenRef.current) setLoading(false);
        }
      })();
    }, FILTER_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [listMode, slugs, maxDistanceKm, minRating, coords?.lat, coords?.lng, city, browseRetryToken, viewerEmail, destCoords?.lat, destCoords?.lng]);

  useEffect(() => {
    if (listMode !== 'voice' || !voiceQuery || coords == null) return;
    sortRefetchSkipRef.current = true;
    void runVoiceFetch(voiceQuery, sortMode, minRating);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when voice query or coords change
  }, [listMode, voiceQuery, coords?.lat, coords?.lng, city]);

  useEffect(() => {
    if (sortRefetchSkipRef.current) {
      sortRefetchSkipRef.current = false;
      return;
    }
    if (listMode !== 'voice' || !voiceQuery || voiceQuery.isCartOrder) return;

    let cancelled = false;
    void (async () => {
      try {
        const { response: res, expandedSearch } = await fetchVoiceProductRestaurants({
          origin_lat: coords?.lat,
          origin_lng: coords?.lng,
          city,
          sort: sortMode,
          limit: 50,
          min_rating: minRating,
          voice_product: voiceQuery.voiceProduct!,
          price_max: voiceQuery.priceMax ?? undefined,
          max_distance_km: voiceQuery.maxDistanceKm ?? undefined,
          user_email: viewerEmail,
          dest_lat: destCoords?.lat,
          dest_lng: destCoords?.lng,
        });
        if (cancelled) return;
        setVoiceSearchExpanded(expandedSearch);
        setAllItems(Array.isArray(res.items) ? res.items : []);
      } catch {
        // Mevcut listeyi koru; client-side siralama yine calisir.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sortMode, voiceQuery, listMode, coords?.lat, coords?.lng, city, minRating]);

  const items = useMemo(() => {
    const origin = coords ? { lat: coords.lat, lng: coords.lng } : null;
    if (listMode === 'voice' && voiceQuery) {
      return sortOnlineOrderRestaurants(allItems, sortMode, origin);
    }
    const filtered = filterOnlineOrderRestaurants(allItems, {
      selectedSlugs: slugs,
      minRating,
      maxDistanceKm,
      hasCoords: coords != null,
    });
    return sortOnlineOrderRestaurants(filtered, sortMode, origin);
  }, [allItems, slugs, minRating, maxDistanceKm, coords, sortMode, voiceQuery, listMode]);

  const voiceRestaurantOptions = useMemo(
    () =>
      buildVoiceOrderRestaurantOptions(
        items.map((row) => ({ id: row.id, name: row.name })),
        8,
      ),
    [items],
  );

  const voiceLetterById = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of voiceRestaurantOptions) {
      map.set(row.id, row.letter);
    }
    return map;
  }, [voiceRestaurantOptions]);

  const showProductPriceOnCards = useMemo(
    () => shouldShowVoiceProductPrice(voiceQuery),
    [voiceQuery],
  );

  const hydrateFromRoute = useCallback((params: OnlineOrderResultsParams) => {
    if (params.mode === 'filter') {
      setListMode('browse');
      setSlugsState(params.slugs);
      setMaxDistanceKmState(params.maxDistanceKm);
      setMinRatingState(params.minRating);
      if (params.sort) setSortMode(params.sort);
      setVoiceQuery(null);
      return;
    }
    setListMode('voice');
    setVoiceQuery(voiceQueryFromParams(params));
    if (params.sort) setSortMode(params.sort);
    setMinRatingState(params.minRating);
  }, []);

  const runVoiceSearch = useCallback(
    async (query: VoiceOrderQuery) => {
      if (!query.voiceProduct && !query.isCartOrder) return;
      setVoiceSearching(true);
      setVoiceSheetOpen(false);
      setListMode('voice');
      setVoiceQuery(query);
    },
    [],
  );

  const onVoiceSearch = useCallback(
    async (query: VoiceOrderQuery) => {
      await runVoiceSearch(query);
    },
    [runVoiceSearch],
  );

  const onVoiceOrderCommand = useCallback(
    async (command: VoiceOrderCommand) => {
      if (command.restaurantIndex != null) {
        const restaurant = items[command.restaurantIndex];
        if (!restaurant) return;
        setVoiceCommandOpen(false);
        setVoiceCartSelections({});
        setVoiceOrderCommand(command);
        setVoiceConfirmRestaurant(restaurant);
        setVoiceConfirmOpen(true);
        return;
      }

      if (!isSmartCartCommand(command)) return;

      setVoiceCommandOpen(false);
      setLoading(true);
      setError(null);
      try {
        const groups = smartCartProductGroups(command);
        const { response: res, expandedSearch } = await fetchVoiceProductRestaurants({
          origin_lat: coords?.lat,
          origin_lng: coords?.lng,
          city,
          sort: sortMode,
          limit: 50,
          min_rating: minRating,
          voice_products: groups.join(','),
          user_email: viewerEmail,
          dest_lat: destCoords?.lat,
          dest_lng: destCoords?.lng,
        });
        setVoiceSearchExpanded(expandedSearch);
        const cartItems = Array.isArray(res.items) ? res.items : [];
        setAllItems(cartItems);

        await ensureGastroPlaybackReady();

        const options = buildVoiceOrderRestaurantOptions(
          cartItems.map((row) => ({ id: row.id, name: row.name })),
          8,
        );
        const candidate = pickBestSmartCartCandidate(cartItems, command, options);
        if (!candidate) {
          gastroSpeakNoResults(() => setVoiceCommandOpen(true));
          return;
        }

        const enriched = enrichVoiceOrderCommandWithCandidate(command, candidate);
        const restaurant = cartItems[candidate.restaurantIndex];
        if (!restaurant) {
          setVoiceCommandOpen(true);
          return;
        }

        setVoiceCartSelections(candidate.selectedByLine);
        setVoiceOrderCommand(enriched);
        setVoiceConfirmRestaurant(restaurant);
        gastroSpeakSmartCartProposal(
          {
            letter: candidate.letter,
            restaurantName: candidate.restaurantName,
            lines: candidate.lines.map((row) => ({
              quantity: row.intent.quantity,
              label: row.match.label,
              unitPriceTl: row.match.price_tl,
              lineTotalTl: row.lineTotal,
            })),
            orderTotal: candidate.orderTotal,
            budgetMax: command.priceMaxBudget,
          },
          () => setVoiceConfirmOpen(true),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Akıllı sepet araması başarısız');
        await ensureGastroPlaybackReady();
        gastroSpeakRetry();
        setVoiceCommandOpen(true);
      } finally {
        setLoading(false);
      }
    },
    [items, coords?.lat, coords?.lng, sortMode, minRating, city],
  );

  const openVoiceSheet = useCallback(() => {
    gastroStopSpeaking();
    setVoiceSheetOpen(true);
  }, []);

  const clearSlugs = useCallback(() => {
    setSlugs([]);
  }, [setSlugs]);

  const widenDistance = useCallback(
    (km: number) => {
      setMaxDistanceKm(km);
    },
    [setMaxDistanceKm],
  );

  return {
    listMode,
    slugs,
    setSlugs,
    maxDistanceKm,
    setMaxDistanceKm,
    minRating,
    setMinRating,
    sortMode,
    setSortMode,
    items,
    loading,
    error,
    usingFallbackCoords,
    voiceQuery,
    voiceSearchExpanded,
    reloadBrowse,
    runVoiceSearch,
    exitVoiceMode,
    hydrateFromRoute,
    voiceSheetOpen,
    setVoiceSheetOpen,
    voiceSearching,
    voiceConfirmOpen,
    setVoiceConfirmOpen,
    voiceCommandOpen,
    setVoiceCommandOpen,
    voiceOrderCommand,
    setVoiceOrderCommand,
    voiceConfirmRestaurant,
    setVoiceConfirmRestaurant,
    voiceCartSelections,
    setVoiceCartSelections,
    voiceRestaurantOptions,
    voiceLetterById,
    showProductPriceOnCards,
    onVoiceSearch,
    onVoiceOrderCommand,
    openVoiceSheet,
    clearSlugs,
    widenDistance,
  };
}
