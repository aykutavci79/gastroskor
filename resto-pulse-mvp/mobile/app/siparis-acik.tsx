import { Stack, useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { FilterRangeBar } from '@/components/FilterRangeBar';
import { KitchenCategoryGrid } from '@/components/KitchenCategoryGrid';
import { OnlineOrderRestaurantCard } from '@/components/OnlineOrderRestaurantCard';
import { OnlineOrderSortBar } from '@/components/OnlineOrderSortBar';
import { Screen } from '@/components/ui/Screen';
import { ONLINE_ORDER_CATEGORIES } from '@/constants/online-order-categories';
import { ONLINE_ORDER_MIN_RATING } from '@/constants/online-orders';
import { GastroColors } from '@/constants/theme';
import { listOnlineOrderRestaurants } from '@/lib/api';
import {
  filterOnlineOrderRestaurants,
  toggleKitchenSlug,
} from '@/lib/online-order-filter';
import {
  sortOnlineOrderRestaurants,
  type OnlineOrderSortMode,
} from '@/lib/online-order-sort';
import {
  parseVoiceOrderCommand,
  type VoiceOrderCommand,
} from '@/lib/parse-voice-order-command';
import {
  buildVoiceOrderRestaurantOptions,
} from '@/lib/voice-order-letters';
import { useSession } from '@/context/session-context';
import { BURSA_CENTER_COORDS, resolveDeviceCoords } from '@/lib/device-location';
import {
  formatVoiceOrderSummary,
  type VoiceOrderQuery,
} from '@/lib/parse-voice-order-query';
import { restaurantDetailHref } from '@/lib/uuid';
import { formatDistanceLabel } from '@/lib/travel-estimate';
import { gastroSpeakVoiceOrderRestaurantOptions } from '@/lib/gastro-speak';

import type { OnlineOrderCategoryOption, RestaurantListItem } from '@/lib/types';

const MAX_DISTANCE_KM = 10;
const DEFAULT_DISTANCE_KM = 5;
const MAX_RATING = 5;

type AppliedFilters = {
  slugs: string[];
  maxDistanceKm: number;
  minRating: number;
};

export default function OnlineOrdersOpenScreen() {
  const navigation = useNavigation();
  const { user } = useSession();
  const [allItems, setAllItems] = useState<RestaurantListItem[]>([]);
  const [categories, setCategories] = useState<OnlineOrderCategoryOption[]>(ONLINE_ORDER_CATEGORIES);
  const [draftSlugs, setDraftSlugs] = useState<string[]>([]);
  const [draftMaxDistanceKm, setDraftMaxDistanceKm] = useState(DEFAULT_DISTANCE_KM);
  const [draftMinRating, setDraftMinRating] = useState(ONLINE_ORDER_MIN_RATING);
  const [applied, setApplied] = useState<AppliedFilters | null>(null);
  const [hasListed, setHasListed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<OnlineOrderSortMode>('gastro_score');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [voiceSheetOpen, setVoiceSheetOpen] = useState(false);
  const [voiceQuery, setVoiceQuery] = useState<VoiceOrderQuery | null>(null);
  const [voiceSearching, setVoiceSearching] = useState(false);
  const [voiceOrderCommand, setVoiceOrderCommand] = useState<VoiceOrderCommand | null>(null);
  const [voiceConfirmOpen, setVoiceConfirmOpen] = useState(false);
  const [voiceConfirmRestaurant, setVoiceConfirmRestaurant] = useState<RestaurantListItem | null>(null);
  const [voiceCommandOpen, setVoiceCommandOpen] = useState(false);
  const [usingFallbackCoords, setUsingFallbackCoords] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const resolved = await resolveDeviceCoords({ requestPermission: true, timeoutMs: 12_000 });
      if (cancelled) return;
      if (resolved) {
        setCoords(resolved);
        setUsingFallbackCoords(false);
      } else {
        setCoords(BURSA_CENTER_COORDS);
        setUsingFallbackCoords(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const clearVoiceSearch = useCallback(() => {
    setVoiceQuery(null);
    setVoiceSheetOpen(false);
    setVoiceCommandOpen(false);
    setHasListed(false);
    setApplied(null);
    setAllItems([]);
  }, []);

  const loadCatalog = useCallback(async (minRating: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listOnlineOrderRestaurants({
        origin_lat: coords?.lat,
        origin_lng: coords?.lng,
        city: 'Bursa',
        sort: 'gastro_score',
        limit: 50,
        min_rating: minRating,
      });
      setAllItems(Array.isArray(res.items) ? res.items : []);
      if (Array.isArray(res.categories) && res.categories.length) setCategories(res.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Liste yuklenemedi');
      setAllItems([]);
    } finally {
      setLoading(false);
    }
  }, [coords?.lat, coords?.lng]);

  const filtersDirty =
    applied != null &&
    (JSON.stringify(applied.slugs) !== JSON.stringify(draftSlugs) ||
      applied.maxDistanceKm !== draftMaxDistanceKm ||
      applied.minRating !== draftMinRating);

  const items = useMemo(() => {
    if (!applied && !voiceQuery) return [];
    if (voiceQuery) {
      return sortOnlineOrderRestaurants(allItems, sortMode);
    }
    if (!applied) return [];
    const filtered = filterOnlineOrderRestaurants(allItems, {
      selectedSlugs: applied.slugs,
      minRating: applied.minRating,
      maxDistanceKm: applied.maxDistanceKm,
      hasCoords: coords != null,
    });
    return sortOnlineOrderRestaurants(filtered, sortMode);
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

  const onListele = useCallback(async () => {
    setVoiceQuery(null);
    const nextApplied: AppliedFilters = {
      slugs: draftSlugs,
      maxDistanceKm: draftMaxDistanceKm,
      minRating: draftMinRating,
    };
    setApplied(nextApplied);
    setHasListed(true);
    await loadCatalog(draftMinRating);
  }, [draftSlugs, draftMaxDistanceKm, draftMinRating, loadCatalog]);

  const onVoiceSearch = useCallback(
    async (query: VoiceOrderQuery) => {
      if (!query.voiceProduct) return;
      setVoiceSearching(true);
      setLoading(true);
      setError(null);
      setApplied(null);
      setVoiceQuery(query);
      setHasListed(true);
      try {
        const res = await listOnlineOrderRestaurants({
          origin_lat: coords?.lat,
          origin_lng: coords?.lng,
          city: 'Bursa',
          sort: sortMode,
          limit: 50,
          min_rating: draftMinRating,
          voice_product: query.voiceProduct,
          price_max: query.priceMax ?? undefined,
          max_distance_km: query.maxDistanceKm ?? undefined,
        });
        setAllItems(Array.isArray(res.items) ? res.items : []);
        if (Array.isArray(res.categories) && res.categories.length) setCategories(res.categories);
        setVoiceSheetOpen(false);

        const resultItems = Array.isArray(res.items) ? res.items : [];
        if (resultItems.length > 0) {
          const speechOptions = buildVoiceOrderRestaurantOptions(
            resultItems.map((row) => ({ id: row.id, name: row.name })),
            8,
          );
          gastroSpeakVoiceOrderRestaurantOptions(speechOptions, () => {
            setVoiceCommandOpen(true);
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sesli arama basarisiz');
        setAllItems([]);
      } finally {
        setLoading(false);
        setVoiceSearching(false);
      }
    },
    [coords?.lat, coords?.lng, sortMode, draftMinRating],
  );

  const onVoiceOrderCommand = useCallback(
    (command: VoiceOrderCommand) => {
      if (command.restaurantIndex == null) return;
      const restaurant = items[command.restaurantIndex];
      if (!restaurant) return;
      setVoiceOrderCommand(command);
      setVoiceConfirmRestaurant(restaurant);
      setVoiceConfirmOpen(true);
    },
    [items],
  );

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: 'Online Sipariş',
          headerBackTitle: 'Geri',
          headerBackVisible: true,
          ...(Platform.OS === 'ios' ? { headerBackTitleVisible: true } : {}),
          headerStyle: { backgroundColor: GastroColors.bg },
          headerTintColor: GastroColors.text,
        }}
      />
      <Screen scroll style={styles.page}>
        {!voiceQuery ? (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroKicker}>GastroSkor</Text>
              <Text style={styles.heroTitle}>Lezzetler kapında</Text>
              <Text style={styles.heroSub}>Mutfak seç veya Gastro Sipariş komutuyla ara + sipariş ver</Text>
              <Pressable
                style={({ pressed }) => [styles.voiceHeroBtn, pressed && styles.voiceHeroBtnPressed]}
                onPress={() => setVoiceSheetOpen(true)}>
                <Text style={styles.voiceHeroEmoji}>🎙️</Text>
                <View style={styles.voiceHeroTextWrap}>
                  <Text style={styles.voiceHeroTitle}>Gastro Sipariş</Text>
                  <Text style={styles.voiceHeroSub}>Yaz veya konuş: “150 TL lahmacun”</Text>
                </View>
              </Pressable>
            </View>

            <View style={styles.filterPanel}>
              <Text style={styles.sectionTitle}>Mutfaklar</Text>
              <KitchenCategoryGrid
                categories={categories}
                selectedSlugs={draftSlugs}
                onToggle={(slug) => setDraftSlugs((prev) => toggleKitchenSlug(prev, slug))}
                onClear={() => setDraftSlugs([])}
              />

              <View style={styles.divider} />

              <FilterRangeBar
                label="Mesafe"
                value={draftMaxDistanceKm}
                min={0}
                max={MAX_DISTANCE_KM}
                step={0.1}
                formatValue={(km) => (km <= 0 ? '0 km' : `${km.toFixed(1)} km`)}
                onChange={setDraftMaxDistanceKm}
              />

              <FilterRangeBar
                label="Minimum puan"
                value={draftMinRating}
                min={ONLINE_ORDER_MIN_RATING}
                max={MAX_RATING}
                step={0.1}
                formatValue={(stars) => `${stars.toFixed(1)} ★`}
                onChange={setDraftMinRating}
              />
              <Text style={styles.ratingHint}>3.0 altı restoranlar online siparişte listelenmez.</Text>

              {usingFallbackCoords ? (
                <Text style={styles.coordsHint}>
                  Konum alınamadı — mesafe Bursa merkezine göre hesaplanır.
                </Text>
              ) : null}

              <Pressable
                style={({ pressed }) => [styles.listBtn, pressed && styles.listBtnPressed, loading && styles.listBtnDisabled]}
                onPress={() => void onListele()}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#141414" />
                ) : (
                  <Text style={styles.listBtnText}>
                    {hasListed && filtersDirty ? 'Yeniden listele' : 'Listele'}
                  </Text>
                )}
              </Pressable>
            </View>
          </>
        ) : null}

        {!hasListed ? (
          <View style={styles.promptBox}>
            <Text style={styles.promptTitle}>Hazır mısın?</Text>
            <Text style={styles.promptSub}>
              İstediğin mutfakları seç (veya hepsini bırak), mesafe ve puanı ayarla, Listele’ye bas.
            </Text>
          </View>
        ) : null}

        {voiceQuery && voiceRestaurantOptions.length > 0 ? (
          <View style={styles.voiceLegend}>
            <Text style={styles.voiceLegendText}>
              Sipariş için harf kullan:{' '}
              {voiceRestaurantOptions.map((row) => `${row.letter}=${row.name}`).join(' · ')}
            </Text>
          </View>
        ) : null}

        {voiceQuery ? (
          <View style={styles.voiceResultBanner}>
            <View style={styles.voiceResultTop}>
              <Text style={styles.voiceResultLabel}>Gastro Sipariş araması</Text>
              <Pressable onPress={() => setVoiceSheetOpen(true)}>
                <Text style={styles.voiceResultEdit}>Tekrar ara</Text>
              </Pressable>
            </View>
            <Text style={styles.voiceResultText}>{formatVoiceOrderSummary(voiceQuery)}</Text>
            {items.length > 0 ? (
              <Pressable
                style={styles.voiceOrderLink}
                onPress={() => setVoiceCommandOpen(true)}>
                <Text style={styles.voiceOrderLinkText}>Sipariş komutu (ses veya yaz)</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {hasListed && !loading && items.length > 0 ? (
          <OnlineOrderSortBar value={sortMode} onChange={setSortMode} />
        ) : null}

        {hasListed ? (
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Sonuçlar</Text>
            {!loading ? <Text style={styles.resultCount}>{items.length} mekan</Text> : null}
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {hasListed && !loading && !error && items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Bu filtreye uygun restoran yok</Text>
            <Text style={styles.emptySub}>
              {voiceQuery
                ? 'Pilot restoranlar panelde sesli ürünleri işaretlemeli. Mesafeyi artır veya bütçeyi yükselt.'
                : 'Mutfak seçimini genişlet, mesafeyi artır veya puanı düşür. Pilot işletmeler panelden siparişi açmalı.'}
            </Text>
            <View style={styles.emptyActions}>
              {voiceQuery ? (
                <>
                  <Pressable style={styles.emptyBtn} onPress={() => setVoiceSheetOpen(true)}>
                    <Text style={styles.emptyBtnText}>Tekrar ara</Text>
                  </Pressable>
                  <Pressable style={styles.emptyBtnGhost} onPress={clearVoiceSearch}>
                    <Text style={styles.emptyBtnGhostText}>Mutfak filtresine dön</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  style={styles.emptyBtn}
                  onPress={() => {
                    setApplied(null);
                    setHasListed(false);
                  }}>
                  <Text style={styles.emptyBtnText}>Filtreleri düzenle</Text>
                </Pressable>
              )}
            </View>
          </View>
        ) : null}

        {hasListed ? (
          <View style={styles.list}>
            {items.map((restaurant, index) => {
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
                  key={`${restaurant.id}-${index}`}
                  restaurant={restaurant}
                  href={href ?? `/restaurant/${restaurant.id}`}
                  distanceLabel={distanceLabel}
                  googleRating={restaurant.google_rating}
                  voiceMatches={restaurant.voice_menu_matches}
                  voiceLetter={voiceLetterById.get(restaurant.id) ?? null}
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
        onClose={() => setVoiceConfirmOpen(false)}
        onSuccess={() => {
          setVoiceOrderCommand(null);
          setVoiceConfirmRestaurant(null);
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
                  setVoiceCommandOpen(false);
                  onVoiceOrderCommand(command);
                }}
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GastroColors.bg },
  page: { gap: 16 },
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
  hero: {
    borderRadius: 18,
    padding: 20,
    backgroundColor: '#1a1210',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.35)',
    gap: 6,
  },
  heroKicker: {
    color: GastroColors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: GastroColors.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  heroSub: {
    color: GastroColors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  voiceHeroBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.55)',
    backgroundColor: 'rgba(255,107,53,0.12)',
    padding: 14,
  },
  voiceHeroBtnPressed: { opacity: 0.92 },
  voiceHeroEmoji: { fontSize: 28 },
  voiceHeroTextWrap: { flex: 1, gap: 2 },
  voiceHeroTitle: { color: GastroColors.text, fontSize: 16, fontWeight: '800' },
  voiceHeroSub: { color: GastroColors.muted, fontSize: 12, lineHeight: 16 },
  voiceResultBanner: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.35)',
    backgroundColor: 'rgba(255,107,53,0.08)',
    padding: 14,
    gap: 6,
  },
  voiceResultTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  voiceResultLabel: {
    color: GastroColors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  voiceResultText: { color: GastroColors.text, fontSize: 15, fontWeight: '700' },
  voiceResultEdit: { color: GastroColors.gold, fontSize: 13, fontWeight: '700' },
  voiceOrderLink: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  voiceOrderLinkText: { color: GastroColors.gold, fontSize: 13, fontWeight: '700' },
  voiceLegend: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    padding: 12,
  },
  voiceLegendText: { color: GastroColors.muted, fontSize: 12, lineHeight: 17 },
  filterPanel: {
    borderRadius: 18,
    padding: 16,
    gap: 14,
    backgroundColor: GastroColors.panel,
    borderWidth: 1,
    borderColor: GastroColors.border,
  },
  sectionTitle: {
    color: GastroColors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: GastroColors.border,
  },
  coordsHint: { color: GastroColors.muted, fontSize: 12, lineHeight: 17 },
  ratingHint: { color: GastroColors.muted, fontSize: 12, lineHeight: 17, marginTop: -6 },
  listBtn: {
    marginTop: 4,
    backgroundColor: GastroColors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  listBtnPressed: { opacity: 0.92 },
  listBtnDisabled: { opacity: 0.75 },
  listBtnText: {
    color: '#141414',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  promptBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    padding: 16,
    gap: 6,
  },
  promptTitle: { color: GastroColors.text, fontSize: 16, fontWeight: '800' },
  promptSub: { color: GastroColors.muted, fontSize: 13, lineHeight: 18 },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  resultCount: { color: GastroColors.gold, fontSize: 13, fontWeight: '700' },
  list: { gap: 16 },
  error: { color: GastroColors.bad, fontSize: 13 },
  emptyBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    padding: 16,
    gap: 6,
  },
  emptyTitle: { color: GastroColors.text, fontSize: 16, fontWeight: '700' },
  emptySub: { color: GastroColors.muted, fontSize: 13, lineHeight: 18 },
  emptyActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  emptyBtn: {
    borderRadius: 12,
    backgroundColor: GastroColors.gold,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emptyBtnText: { color: '#141414', fontWeight: '800', fontSize: 13 },
  emptyBtnGhost: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GastroColors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emptyBtnGhostText: { color: GastroColors.muted, fontWeight: '700', fontSize: 13 },
});
