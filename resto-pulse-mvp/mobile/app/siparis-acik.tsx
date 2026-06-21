import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  InteractionManager,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { VoiceOrderSheet } from '@/components/VoiceOrderSheet';
import { FilterRangeBar } from '@/components/FilterRangeBar';
import { KitchenCategoryGrid } from '@/components/KitchenCategoryGrid';
import { Screen } from '@/components/ui/Screen';
import { ONLINE_ORDER_CATEGORIES } from '@/constants/online-order-categories';
import { ONLINE_ORDER_MIN_RATING } from '@/constants/online-orders';
import { useCity } from '@/context/city-context';
import { useGastroTheme } from '@/context/theme-context';
import { toggleKitchenSlug } from '@/lib/online-order-filter';
import {
  buildOnlineOrderFilterResultsHref,
  buildOnlineOrderVoiceResultsHref,
} from '@/lib/online-order-results-route';
import { parseVoiceOrderQuery } from '@/lib/parse-voice-order-query';
import { resolveDeviceCoords } from '@/lib/device-location';
import { consumePendingOnlineOrderVoice } from '@/lib/kesfet-voice-bridge';
import {
  parseOnlineOrderVoiceLaunch,
  parseOnlineOrderVoiceRouteParams,
} from '@/lib/online-order-voice-launch';
import type { OnlineOrderCategoryOption } from '@/lib/types';

const MAX_DISTANCE_KM = 10;
const DEFAULT_DISTANCE_KM = 5;
const MAX_RATING = 5;

export default function OnlineOrdersOpenScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const routeParams = useLocalSearchParams();
  const { cityLabel, fallbackCoords } = useCity();
  const { colors, shadow } = useGastroTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [colors, shadow]);
  const voiceLaunchHandledRef = useRef(false);

  const [categories] = useState<OnlineOrderCategoryOption[]>(ONLINE_ORDER_CATEGORIES);
  const [draftSlugs, setDraftSlugs] = useState<string[]>([]);
  const [draftMaxDistanceKm, setDraftMaxDistanceKm] = useState(DEFAULT_DISTANCE_KM);
  const [draftMinRating, setDraftMinRating] = useState(ONLINE_ORDER_MIN_RATING);
  const [usingFallbackCoords, setUsingFallbackCoords] = useState(false);
  const [voiceSheetOpen, setVoiceSheetOpen] = useState(false);
  const [voiceSheetInitialDraft, setVoiceSheetInitialDraft] = useState<string | undefined>();
  const [siriVoiceLaunch, setSiriVoiceLaunch] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const resolved = await resolveDeviceCoords({ requestPermission: true, timeoutMs: 12_000 });
      if (cancelled) return;
      setUsingFallbackCoords(!resolved);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!voiceSheetOpen) return;
      event.preventDefault();
      setVoiceSheetOpen(false);
    });
    return unsubscribe;
  }, [navigation, voiceSheetOpen]);

  const onListele = useCallback(() => {
    router.push(
      buildOnlineOrderFilterResultsHref({
        slugs: draftSlugs,
        maxDistanceKm: draftMaxDistanceKm,
        minRating: draftMinRating,
      }),
    );
  }, [router, draftSlugs, draftMaxDistanceKm, draftMinRating]);

  const navigateVoiceSearch = useCallback(
    (orderText: string) => {
      const query = parseVoiceOrderQuery(orderText);
      if (!query.voiceProduct && !query.isCartOrder) return false;
      setVoiceSheetOpen(false);
      router.push(
        buildOnlineOrderVoiceResultsHref(query, {
          minRating: draftMinRating,
        }),
      );
      return true;
    },
    [router, draftMinRating],
  );

  const openVoiceFromLaunch = useCallback(
    (launch: { openVoice: boolean; orderText?: string }) => {
      if (!launch.openVoice || voiceLaunchHandledRef.current) return;
      voiceLaunchHandledRef.current = true;

      if (launch.orderText && navigateVoiceSearch(launch.orderText)) {
        return;
      }
      if (launch.orderText) {
        setVoiceSheetInitialDraft(launch.orderText);
      } else {
        setVoiceSheetInitialDraft(undefined);
      }
      setSiriVoiceLaunch(true);
      setVoiceSheetOpen(true);
    },
    [navigateVoiceSearch],
  );

  const voiceLaunchFlag = useMemo(() => {
    const launch = parseOnlineOrderVoiceRouteParams(routeParams);
    return launch.openVoice ? launch : null;
  }, [routeParams]);

  useEffect(() => {
    if (!voiceLaunchFlag) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(
        () => openVoiceFromLaunch(voiceLaunchFlag),
        Platform.OS === 'ios' ? 550 : 350,
      );
    });

    return () => {
      task.cancel();
      if (timer) clearTimeout(timer);
    };
  }, [voiceLaunchFlag, openVoiceFromLaunch]);

  useEffect(() => {
    void Linking.getInitialURL().then((url) => {
      const launch = parseOnlineOrderVoiceLaunch(url);
      if (!launch.openVoice) return;
      setTimeout(
        () => openVoiceFromLaunch(launch),
        Platform.OS === 'ios' ? 750 : 450,
      );
    });

    const sub = Linking.addEventListener('url', ({ url }) => {
      const launch = parseOnlineOrderVoiceLaunch(url);
      if (!launch.openVoice) return;
      voiceLaunchHandledRef.current = false;
      openVoiceFromLaunch(launch);
    });

    return () => sub.remove();
  }, [openVoiceFromLaunch]);

  useFocusEffect(
    useCallback(() => {
      const pending = consumePendingOnlineOrderVoice();
      if (!pending?.openSheet) return;

      if (pending.orderText && navigateVoiceSearch(pending.orderText)) {
        return;
      }
      if (pending.orderText) {
        setVoiceSheetInitialDraft(pending.orderText);
      } else {
        setVoiceSheetInitialDraft(undefined);
      }
      setVoiceSheetOpen(true);
    }, [navigateVoiceSearch]),
  );

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: 'Online Sipariş',
          headerBackTitle: 'Geri',
          headerBackVisible: true,
          ...(Platform.OS === 'ios' ? { headerBackTitleVisible: true } : {}),
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
        }}
      />
      <Screen scroll edges={['left', 'right']} style={styles.page}>
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
              Konum alınamadı — mesafe {cityLabel} merkezine göre hesaplanır.
            </Text>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.listBtn, pressed && styles.listBtnPressed]}
            onPress={onListele}>
            <Text style={styles.listBtnText}>Listele</Text>
          </Pressable>
        </View>

        <View style={styles.promptBox}>
          <Text style={styles.promptTitle}>Hazır mısın?</Text>
          <Text style={styles.promptSub}>
            İstediğin mutfakları seç (veya hepsini bırak), mesafe ve puanı ayarla, Listele’ye bas — sonuçlar ayrı sayfada açılır.
          </Text>
        </View>
      </Screen>

      <VoiceOrderSheet
        visible={voiceSheetOpen}
        searching={false}
        initialDraft={voiceSheetInitialDraft}
        startMicImmediately={siriVoiceLaunch}
        onClose={() => {
          setVoiceSheetOpen(false);
          setVoiceSheetInitialDraft(undefined);
          setSiriVoiceLaunch(false);
        }}
        onSearch={(query) => {
          if (!query.voiceProduct) return;
          setVoiceSheetOpen(false);
          router.push(
            buildOnlineOrderVoiceResultsHref(query, {
              minRating: draftMinRating,
            }),
          );
        }}
      />
    </View>
  );
}

function createStyles(
  colors: import('@/constants/theme').GastroColorScheme,
  shadow: import('@/constants/theme').GastroShadowScheme,
) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  page: { gap: 16 },
  hero: {
    borderRadius: 18,
    padding: 20,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.35)',
    gap: 6,
    ...shadow.card,
  },
  heroKicker: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  heroSub: {
    color: colors.muted,
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
    backgroundColor: colors.accentSoft,
    padding: 14,
  },
  voiceHeroBtnPressed: { opacity: 0.92 },
  voiceHeroEmoji: { fontSize: 28 },
  voiceHeroTextWrap: { flex: 1, gap: 2 },
  voiceHeroTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  voiceHeroSub: { color: colors.muted, fontSize: 12, lineHeight: 16 },
  filterPanel: {
    borderRadius: 18,
    padding: 16,
    gap: 14,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  coordsHint: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  ratingHint: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: -6 },
  listBtn: {
    marginTop: 4,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  listBtnPressed: { opacity: 0.92 },
  listBtnText: {
    color: colors.accentDark,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  promptBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: 16,
    gap: 6,
    ...shadow.card,
  },
  promptTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  promptSub: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  });
}
