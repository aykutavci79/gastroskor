import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
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

import { gastroCoinStackHeaderTitle } from '@/components/GastroCoinHeaderTitle';
import { OnlineOrderVoiceSearchBar } from '@/components/OnlineOrderVoiceSearchBar';
import { FilterRangeBar } from '@/components/FilterRangeBar';
import { KitchenCategoryGrid } from '@/components/KitchenCategoryGrid';
import { Screen } from '@/components/ui/Screen';
import { ONLINE_ORDER_CATEGORIES } from '@/constants/online-order-categories';
import { ONLINE_ORDER_MIN_RATING } from '@/constants/online-orders';
import { GastroColorsLight } from '@/constants/theme';
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
const ONLINE_ORDER_PAGE_BG = '#FFFFFF';

export default function OnlineOrdersOpenScreen() {
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
  const [voiceSearchDraft, setVoiceSearchDraft] = useState<string | undefined>();

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
      router.push(
        buildOnlineOrderVoiceResultsHref(query, {
          minRating: query.minRating ?? draftMinRating,
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
        setVoiceSearchDraft(launch.orderText);
      } else {
        setVoiceSearchDraft(undefined);
      }
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
        setVoiceSearchDraft(pending.orderText);
      } else {
        setVoiceSearchDraft(undefined);
      }
    }, [navigateVoiceSearch]),
  );

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          headerTitle: gastroCoinStackHeaderTitle('Online Sipariş', 'light'),
          headerBackTitle: 'Geri',
          headerBackVisible: true,
          ...(Platform.OS === 'ios' ? { headerBackTitleVisible: true } : {}),
          headerStyle: { backgroundColor: ONLINE_ORDER_PAGE_BG },
          headerTintColor: GastroColorsLight.text,
          headerShadowVisible: false,
        }}
      />
      <Screen scroll edges={['left', 'right', 'bottom']} backgroundColor={ONLINE_ORDER_PAGE_BG} style={styles.page}>
        <OnlineOrderVoiceSearchBar
          tone="light"
          initialDraft={voiceSearchDraft}
          onSearch={(query) => {
            if (!query.voiceProduct && !query.isCartOrder) return;
            router.push(
              buildOnlineOrderVoiceResultsHref(query, {
                minRating: draftMinRating,
              }),
            );
          }}
        >
          <Text style={styles.kitchensTitle}>Mutfaklar</Text>
          <KitchenCategoryGrid
            categories={categories}
            selectedSlugs={draftSlugs}
            onToggle={(slug) => setDraftSlugs((prev) => toggleKitchenSlug(prev, slug))}
            onClear={() => setDraftSlugs([])}
          />
        </OnlineOrderVoiceSearchBar>

        <View style={styles.filterPanel}>
          <FilterRangeBar
            tone="light"
            label="Mesafe"
            value={draftMaxDistanceKm}
            min={0}
            max={MAX_DISTANCE_KM}
            step={0.1}
            formatValue={(km) => (km <= 0 ? '0 km' : `${km.toFixed(1)} km`)}
            onChange={setDraftMaxDistanceKm}
          />

          <FilterRangeBar
            tone="light"
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
    </View>
  );
}

function createStyles(
  colors: import('@/constants/theme').GastroColorScheme,
  shadow: import('@/constants/theme').GastroShadowScheme,
) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: ONLINE_ORDER_PAGE_BG },
  page: { gap: 16 },
  kitchensTitle: {
    color: GastroColorsLight.text,
    fontSize: 17,
    fontWeight: '800',
  },
  filterPanel: {
    borderRadius: 16,
    padding: 16,
    gap: 14,
    backgroundColor: ONLINE_ORDER_PAGE_BG,
    borderWidth: 1,
    borderColor: GastroColorsLight.border,
  },
  coordsHint: { color: GastroColorsLight.muted, fontSize: 12, lineHeight: 17 },
  ratingHint: { color: GastroColorsLight.muted, fontSize: 12, lineHeight: 17, marginTop: -6 },
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
    color: GastroColorsLight.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  promptBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GastroColorsLight.border,
    backgroundColor: ONLINE_ORDER_PAGE_BG,
    padding: 16,
    gap: 6,
  },
  promptTitle: { color: GastroColorsLight.text, fontSize: 16, fontWeight: '800' },
  promptSub: { color: GastroColorsLight.muted, fontSize: 13, lineHeight: 18 },
  });
}
