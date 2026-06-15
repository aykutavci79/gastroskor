import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { VoiceOrderCommandBar } from '@/components/VoiceOrderCommandBar';
import { VoiceOrderConfirmSheet } from '@/components/VoiceOrderConfirmSheet';
import { VoiceOrderSheet } from '@/components/VoiceOrderSheet';
import { OnlineOrderRestaurantCard } from '@/components/OnlineOrderRestaurantCard';
import { OnlineOrderSortBar } from '@/components/OnlineOrderSortBar';
import { Screen } from '@/components/ui/Screen';
import { GastroStyles } from '@/constants/theme';
import { useCity } from '@/context/city-context';
import { useGastroTheme } from '@/context/theme-context';
import { useSession } from '@/context/session-context';
import { listOnlineOrderRestaurants } from '@/lib/api';
import { fetchVoiceProductRestaurants } from '@/lib/online-order-voice-fetch';
import { filterOnlineOrderRestaurants } from '@/lib/online-order-filter';
import {
  buildOnlineOrderVoiceResultsHref,
  parseOnlineOrderResultsRouteParams,
  type OnlineOrderResultsParams,
} from '@/lib/online-order-results-route';
import {
  sortOnlineOrderRestaurants,
  type OnlineOrderSortMode,
} from '@/lib/online-order-sort';
import type { VoiceOrderCommand } from '@/lib/parse-voice-order-command';
import { parseVoiceOrderCommand } from '@/lib/parse-voice-order-command';
import { buildVoiceOrderRestaurantOptions } from '@/lib/voice-order-letters';
import { resolveDeviceCoords } from '@/lib/device-location';
import {
  formatVoiceOrderSummary,
  parseVoiceOrderQuery,
  shouldShowVoiceProductPrice,
  type VoiceOrderQuery,
} from '@/lib/parse-voice-order-query';
import { restaurantDetailHref } from '@/lib/uuid';
import { formatDistanceLabel } from '@/lib/travel-estimate';
import {
  ensureGastroPlaybackReady,
  gastroSpeakNoResults,
  gastroSpeakRetry,
  gastroSpeakSmartCartProposal,
  gastroSpeakVoiceOrderRestaurantOptions,
  gastroStopSpeaking,
} from '@/lib/gastro-speak';
import {
  enrichVoiceOrderCommandWithCandidate,
  isSmartCartCommand,
  pickBestSmartCartCandidate,
  smartCartProductGroups,
} from '@/lib/smart-voice-cart';
import type { RestaurantListItem, VoiceMenuMatch } from '@/lib/types';

type AppliedFilters = {
  slugs: string[];
  maxDistanceKm: number;
  minRating: number;
};

function voiceQueryFromParams(params: Extract<OnlineOrderResultsParams, { mode: 'voice' }>): VoiceOrderQuery {
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
    confidence: 'high',
    issues: [],
  };
}

export default function OnlineOrderResultsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const routeParams = useLocalSearchParams<Record<string, string | string[] | undefined>>();
  const { user } = useSession();
  const { city, cityLabel, fallbackCoords } = useCity();
  const { colors, shadow } = useGastroTheme();
  const styles = useMemo(() => createResultsStyles(colors, shadow), [colors, shadow]);

  const routeConfig = useMemo(
    () => parseOnlineOrderResultsRouteParams(routeParams),
    [routeParams],
  );

  const routeKey = useMemo(() => JSON.stringify(routeConfig), [routeConfig]);

  const [allItems, setAllItems] = useState<RestaurantListItem[]>([]);
  const [applied, setApplied] = useState<AppliedFilters | null>(null);
  const [voiceQuery, setVoiceQuery] = useState<VoiceOrderQuery | null>(null);
  const [voiceSearchExpanded, setVoiceSearchExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<OnlineOrderSortMode>(
    () => routeConfig?.sort ?? 'gastro_score',
  );
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [voiceSheetOpen, setVoiceSheetOpen] = useState(false);
  const [voiceSearching, setVoiceSearching] = useState(false);
  const [voiceOrderCommand, setVoiceOrderCommand] = useState<VoiceOrderCommand | null>(null);
  const [voiceConfirmOpen, setVoiceConfirmOpen] = useState(false);
  const [voiceConfirmRestaurant, setVoiceConfirmRestaurant] = useState<RestaurantListItem | null>(null);
  const [voiceCommandOpen, setVoiceCommandOpen] = useState(false);
  const [voiceCartSelections, setVoiceCartSelections] = useState<Record<number, VoiceMenuMatch>>({});
  const loadedKeyRef = useRef<string | null>(null);
  const sortRefetchSkipRef = useRef(true);

  const openVoiceSheet = useCallback(() => {
    gastroStopSpeaking();
    setVoiceSheetOpen(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => gastroStopSpeaking();
    }, []),
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const resolved = await resolveDeviceCoords({ requestPermission: true, timeoutMs: 12_000 });
      if (cancelled) return;
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
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!voiceSheetOpen && !voiceConfirmOpen && !voiceCommandOpen) return;
      event.preventDefault();
      if (voiceConfirmOpen) setVoiceConfirmOpen(false);
      else if (voiceCommandOpen) setVoiceCommandOpen(false);
      else if (voiceSheetOpen) setVoiceSheetOpen(false);
    });
    return unsubscribe;
  }, [navigation, voiceSheetOpen, voiceConfirmOpen, voiceCommandOpen]);

  useEffect(() => {
    const config = routeKey === 'null' ? null : (JSON.parse(routeKey) as OnlineOrderResultsParams);
    if (!config) {
      router.replace('/siparis-acik');
      return;
    }
    if (coords == null) return;

    const loadKey = `${routeKey}|${coords.lat}|${coords.lng}`;
    if (loadedKeyRef.current === loadKey) return;
    loadedKeyRef.current = loadKey;
    sortRefetchSkipRef.current = true;

    if (config.sort) {
      setSortMode((prev) => (prev === config.sort ? prev : config.sort!));
    }

    let cancelled = false;

    void (async () => {
      if (config.mode === 'filter') {
        setLoading(true);
        setError(null);
        setVoiceQuery(null);
        setApplied({
          slugs: config.slugs,
          maxDistanceKm: config.maxDistanceKm,
          minRating: config.minRating,
        });
        try {
          const res = await listOnlineOrderRestaurants({
            origin_lat: coords.lat,
            origin_lng: coords.lng,
            city,
            sort: 'gastro_score',
            limit: 50,
            min_rating: config.minRating,
          });
          if (cancelled) return;
          setAllItems(Array.isArray(res.items) ? res.items : []);
        } catch (err) {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : 'Liste yuklenemedi');
          setAllItems([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      const query = voiceQueryFromParams(config);
      setLoading(true);
      setError(null);
      setApplied(null);
      setVoiceQuery(query);
      setVoiceSearchExpanded(false);
      try {
        const cartGroups = query.isCartOrder
          ? [...new Set(query.cartLines.map((row) => row.productSearchGroup))]
          : [];
        const { response: res, expandedSearch } = await fetchVoiceProductRestaurants({
          origin_lat: coords.lat,
          origin_lng: coords.lng,
          city,
          sort: config.sort ?? 'gastro_score',
          limit: 50,
          min_rating: config.minRating,
          voice_product: query.isCartOrder ? undefined : config.voiceProduct,
          voice_products: query.isCartOrder && cartGroups.length ? cartGroups.join(',') : undefined,
          price_max: query.isCartOrder ? undefined : (config.priceMax ?? undefined),
          max_distance_km: config.maxDistanceKm ?? undefined,
        });
        if (cancelled) return;
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
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Sesli arama basarisiz');
        setAllItems([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setVoiceSearching(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [routeKey, coords?.lat, coords?.lng, city, router]);

  useEffect(() => {
    if (sortRefetchSkipRef.current) {
      sortRefetchSkipRef.current = false;
      return;
    }
    if (!voiceQuery || routeKey === 'null') return;
    if (voiceQuery.isCartOrder) return;

    const config = JSON.parse(routeKey) as OnlineOrderResultsParams;
    if (config.mode !== 'voice') return;

    let cancelled = false;
    void (async () => {
      try {
        const { response: res, expandedSearch } = await fetchVoiceProductRestaurants({
          origin_lat: coords?.lat,
          origin_lng: coords?.lng,
          city,
          sort: sortMode,
          limit: 50,
          min_rating: config.minRating,
          voice_product: voiceQuery.voiceProduct!,
          price_max: voiceQuery.priceMax ?? undefined,
          max_distance_km: voiceQuery.maxDistanceKm ?? undefined,
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
  }, [sortMode, voiceQuery, routeKey, coords?.lat, coords?.lng, city]);

  const items = useMemo(() => {
    if (!applied && !voiceQuery) return [];
    const origin = coords ? { lat: coords.lat, lng: coords.lng } : null;
    if (voiceQuery) {
      return sortOnlineOrderRestaurants(allItems, sortMode, origin);
    }
    if (!applied) return [];
    const filtered = filterOnlineOrderRestaurants(allItems, {
      selectedSlugs: applied.slugs,
      minRating: applied.minRating,
      maxDistanceKm: applied.maxDistanceKm,
      hasCoords: coords != null,
    });
    return sortOnlineOrderRestaurants(filtered, sortMode, origin);
  }, [allItems, applied, coords, sortMode, voiceQuery]);

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

  const onVoiceSearch = useCallback(
    async (query: VoiceOrderQuery) => {
      if (!query.voiceProduct && !query.isCartOrder) return;
      setVoiceSearching(true);
      setVoiceSheetOpen(false);
      router.replace(
        buildOnlineOrderVoiceResultsHref(query, {
          minRating: routeConfig?.minRating ?? 3,
          sort: sortMode,
        }),
      );
    },
    [router, routeConfig?.minRating, sortMode],
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
          min_rating: routeConfig?.minRating ?? 3,
          voice_products: groups.join(','),
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
    [items, coords?.lat, coords?.lng, sortMode, routeConfig?.minRating, city],
  );

  if (!routeConfig) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ title: 'Sonuçlar' }} />
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: 'Sonuçlar',
          headerBackTitle: 'Geri',
          headerBackVisible: true,
          ...(Platform.OS === 'ios' ? { headerBackTitleVisible: true } : {}),
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
        }}
      />
      <Screen scroll edges={['left', 'right']} style={styles.page}>
        {voiceQuery ? (
          <View style={styles.voiceResultBanner}>
            <View style={styles.voiceResultTop}>
              <Text style={styles.voiceResultLabel}>Gastro Sipariş araması</Text>
              <Pressable onPress={openVoiceSheet}>
                <Text style={styles.voiceResultEdit}>Tekrar ara</Text>
              </Pressable>
            </View>
            <Text style={styles.voiceResultText}>{formatVoiceOrderSummary(voiceQuery)}</Text>
            {voiceSearchExpanded ? (
              <Text style={styles.voiceResultHint}>
                {cityLabel} dışında da arandı — en yakın eşleşen mekanlar listeleniyor.
              </Text>
            ) : null}
            {voiceRestaurantOptions.length > 0 ? (
              <Text style={styles.voiceLegendInline} numberOfLines={3}>
                Sipariş harfi:{' '}
                {voiceRestaurantOptions.map((row) => `${row.letter}=${row.name}`).join(' · ')}
              </Text>
            ) : null}
            {items.length > 0 ? (
              <Pressable style={styles.voiceOrderLink} onPress={() => setVoiceCommandOpen(true)}>
                <Text style={styles.voiceOrderLinkText}>Sipariş komutu (ses veya yaz)</Text>
              </Pressable>
            ) : null}
          </View>
        ) : applied ? (
          <View style={styles.filterSummary}>
            <Text style={styles.filterSummaryLabel}>Filtre</Text>
            <Text style={styles.filterSummaryText}>
              {applied.slugs.length
                ? `${applied.slugs.length} mutfak · `
                : 'Tüm mutfaklar · '}
              {applied.maxDistanceKm <= 0 ? 'mesafe sınırı yok' : `${applied.maxDistanceKm.toFixed(1)} km`} ·{' '}
              {applied.minRating.toFixed(1)} ★+
            </Text>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.filterSummaryEdit}>Filtreyi düzenle</Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && items.length > 0 ? (
          <OnlineOrderSortBar value={sortMode} onChange={setSortMode} />
        ) : null}

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>Sonuçlar</Text>
          {!loading ? <Text style={styles.resultCount}>{items.length} mekan</Text> : null}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!loading && !error && items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Bu filtreye uygun restoran yok</Text>
            <Text style={styles.emptySub}>
              {voiceQuery
                ? `“${formatVoiceOrderSummary(voiceQuery)}” için online menüsünde eşleşen mekan bulunamadı. Bütçe veya mesafe sınırını gevşet; deneme restoranları Bursa’da — şehri Bursa yapmayı dene.`
                : 'Mutfak seçimini genişlet veya mesafeyi 10 km yap. Deneme restoranları yalnızca Bursa’da — Keşfet şehrinin Bursa olduğundan emin ol.'}
            </Text>
            <View style={styles.emptyActions}>
              {voiceQuery ? (
                <>
                  <Pressable style={styles.emptyBtn} onPress={openVoiceSheet}>
                    <Text style={styles.emptyBtnText}>Tekrar ara</Text>
                  </Pressable>
                  <Pressable style={styles.emptyBtnGhost} onPress={() => router.replace('/siparis-acik')}>
                    <Text style={styles.emptyBtnGhostText}>Mutfak filtresine dön</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable style={styles.emptyBtn} onPress={() => router.back()}>
                  <Text style={styles.emptyBtnText}>Filtreleri düzenle</Text>
                </Pressable>
              )}
            </View>
          </View>
        ) : null}

        {!loading ? (
          <View style={styles.list}>
            {items.map((restaurant) => {
              const distanceLabel =
                restaurant.distance_meters != null
                  ? formatDistanceLabel({ distance_meters: restaurant.distance_meters })
                  : undefined;
              const href = restaurantDetailHref({
                id: restaurant.id,
                restaurant_id: restaurant.id,
                google_place_id: null,
              });
              return (
                <OnlineOrderRestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  href={href ?? `/restaurant/${restaurant.id}`}
                  distanceLabel={distanceLabel}
                  googleRating={restaurant.google_rating}
                  voiceMatches={restaurant.voice_menu_matches}
                  voiceLetter={voiceLetterById.get(restaurant.id) ?? null}
                  showProductPrice={showProductPriceOnCards}
                />
              );
            })}
          </View>
        ) : null}
      </Screen>

      <VoiceOrderSheet
        visible={voiceSheetOpen}
        searching={voiceSearching}
        onClose={() => setVoiceSheetOpen(false)}
        onSearch={(query) => void onVoiceSearch(query)}
      />

      <VoiceOrderConfirmSheet
        visible={voiceConfirmOpen}
        command={voiceOrderCommand}
        restaurant={voiceConfirmRestaurant}
        userEmail={user?.email ?? null}
        initialSelectedByLine={voiceCartSelections}
        onClose={() => {
          setVoiceConfirmOpen(false);
          setVoiceCartSelections({});
        }}
        onSuccess={() => {
          setVoiceOrderCommand(null);
          setVoiceConfirmRestaurant(null);
          setVoiceCartSelections({});
        }}
      />

      <Modal
        visible={voiceCommandOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setVoiceCommandOpen(false)}>
        <View style={styles.commandModal}>
          <Pressable style={styles.commandBackdrop} onPress={() => setVoiceCommandOpen(false)} />
          <View style={styles.commandSheet}>
            {voiceCommandOpen ? (
              <VoiceOrderCommandBar
                restaurants={voiceRestaurantOptions}
                defaultProductSearchGroup={voiceQuery?.voiceProduct}
                onSubmit={(command) => {
                  void onVoiceOrderCommand(command);
                }}
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createResultsStyles(
  colors: import('@/constants/theme').GastroColorScheme,
  shadow: import('@/constants/theme').GastroShadowScheme,
) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  page: { gap: 8, paddingTop: 4 },
  loader: { marginVertical: 24 },
  commandModal: { flex: 1, justifyContent: 'flex-end' },
  commandBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  commandSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  voiceResultBanner: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.35)',
    backgroundColor: colors.accentSoft,
    padding: 12,
    gap: 4,
  },
  voiceResultTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  voiceResultLabel: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  voiceResultText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  voiceResultHint: { color: colors.muted, fontSize: 12, lineHeight: 16, marginTop: 4 },
  voiceResultEdit: { color: colors.gold, fontSize: 13, fontWeight: '700' },
  voiceOrderLink: {
    marginTop: 2,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  voiceOrderLinkText: { color: colors.gold, fontSize: 13, fontWeight: '700' },
  voiceLegendInline: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  filterSummary: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: 12,
    gap: 4,
    ...shadow.card,
  },
  filterSummaryLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  filterSummaryText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  filterSummaryEdit: { color: colors.gold, fontSize: 13, fontWeight: '700', marginTop: 2 },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  resultCount: { color: colors.gold, fontSize: 13, fontWeight: '700' },
  list: { gap: 6 },
  error: { color: colors.bad, fontSize: 13 },
  emptyBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: 16,
    gap: 6,
    ...shadow.card,
  },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  emptySub: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  emptyActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  emptyBtn: {
    borderRadius: 12,
    backgroundColor: colors.gold,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emptyBtnText: { color: colors.accentDark, fontWeight: '800', fontSize: 13 },
  emptyBtnGhost: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emptyBtnGhostText: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  });
}
