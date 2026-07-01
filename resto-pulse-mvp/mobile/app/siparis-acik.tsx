import { Stack, useLocalSearchParams, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  InteractionManager,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { gastroCoinStackHeaderTitle } from '@/components/GastroCoinHeaderTitle';
import { OnlineOrderKitchenChips } from '@/components/OnlineOrderKitchenChips';
import { OnlineOrderListSection } from '@/components/OnlineOrderListSection';
import { OnlineOrderVoiceResultBanner } from '@/components/OnlineOrderVoiceResultBanner';
import { OnlineOrderVoiceSearchBar } from '@/components/OnlineOrderVoiceSearchBar';
import { FilterRangeBar } from '@/components/FilterRangeBar';
import { VoiceOrderCommandBar } from '@/components/VoiceOrderCommandBar';
import { VoiceOrderConfirmSheet } from '@/components/VoiceOrderConfirmSheet';
import { VoiceOrderSheet } from '@/components/VoiceOrderSheet';
import { Screen } from '@/components/ui/Screen';
import { ONLINE_ORDER_CATEGORIES } from '@/constants/online-order-categories';
import {
  GastroColorsOnlineOrder,
  ONLINE_ORDER_PAGE_BG,
} from '@/constants/online-order-theme';
import { ONLINE_ORDER_MIN_RATING } from '@/constants/online-orders';
import { useCity } from '@/context/city-context';
import { useSession } from '@/context/session-context';
import { useGastroTheme } from '@/context/theme-context';
import { useOnlineOrderListScreen } from '@/hooks/useOnlineOrderListScreen';
import { gastroStopSpeaking } from '@/lib/gastro-speak';
import { toggleKitchenSlug } from '@/lib/online-order-filter';
import { parseOnlineOrderScreenParams } from '@/lib/online-order-screen-route';
import { consumePendingOnlineOrderVoice } from '@/lib/kesfet-voice-bridge';
import {
  parseOnlineOrderVoiceLaunch,
  parseOnlineOrderVoiceRouteParams,
} from '@/lib/online-order-voice-launch';
import { formatVoiceOrderSummary, parseVoiceOrderQuery } from '@/lib/parse-voice-order-query';
import type { OnlineOrderCategoryOption } from '@/lib/types';

const MAX_DISTANCE_KM = 10;
const MAX_RATING = 5;

export default function OnlineOrdersOpenScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const routeParams = useLocalSearchParams();
  const { cityLabel } = useCity();
  const { user } = useSession();
  const { colors, shadow } = useGastroTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [colors, shadow]);
  const screen = useOnlineOrderListScreen();
  const voiceLaunchHandledRef = useRef(false);
  const routeHydratedRef = useRef(false);

  const [categories] = useState<OnlineOrderCategoryOption[]>(ONLINE_ORDER_CATEGORIES);
  const [voiceSearchDraft, setVoiceSearchDraft] = useState<string | undefined>();

  useFocusEffect(
    useCallback(() => {
      return () => gastroStopSpeaking();
    }, []),
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!screen.voiceSheetOpen && !screen.voiceConfirmOpen && !screen.voiceCommandOpen) return;
      event.preventDefault();
      if (screen.voiceConfirmOpen) screen.setVoiceConfirmOpen(false);
      else if (screen.voiceCommandOpen) screen.setVoiceCommandOpen(false);
      else if (screen.voiceSheetOpen) screen.setVoiceSheetOpen(false);
    });
    return unsubscribe;
  }, [
    navigation,
    screen.voiceSheetOpen,
    screen.voiceConfirmOpen,
    screen.voiceCommandOpen,
    screen.setVoiceConfirmOpen,
    screen.setVoiceCommandOpen,
    screen.setVoiceSheetOpen,
  ]);

  useEffect(() => {
    if (routeHydratedRef.current) return;
    const parsed = parseOnlineOrderScreenParams(routeParams);
    if (!parsed) return;
    routeHydratedRef.current = true;
    screen.hydrateFromRoute(parsed);
  }, [routeParams, screen.hydrateFromRoute]);

  const openVoiceFromLaunch = useCallback(
    (launch: { openVoice: boolean; orderText?: string }) => {
      if (!launch.openVoice || voiceLaunchHandledRef.current) return;
      voiceLaunchHandledRef.current = true;

      if (launch.orderText) {
        const query = parseVoiceOrderQuery(launch.orderText);
        if (query.voiceProduct || query.isCartOrder) {
          void screen.runVoiceSearch(query);
          return;
        }
        setVoiceSearchDraft(launch.orderText);
      } else {
        setVoiceSearchDraft(undefined);
      }
    },
    [screen.runVoiceSearch],
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

      if (pending.orderText) {
        const query = parseVoiceOrderQuery(pending.orderText);
        if (query.voiceProduct || query.isCartOrder) {
          void screen.runVoiceSearch(query);
          return;
        }
        setVoiceSearchDraft(pending.orderText);
      } else {
        setVoiceSearchDraft(undefined);
      }
    }, [screen.runVoiceSearch]),
  );

  const voiceEmptyActions =
    screen.listMode === 'voice' && screen.voiceQuery ? (
      <>
        <Pressable style={styles.emptyBtn} onPress={screen.openVoiceSheet}>
          <Text style={styles.emptyBtnText}>{t('order.retrySearch')}</Text>
        </Pressable>
        <Pressable style={styles.emptyBtnGhost} onPress={screen.exitVoiceMode}>
          <Text style={styles.emptyBtnGhostText}>{t('order.backToList')}</Text>
        </Pressable>
      </>
    ) : undefined;

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          headerTitle: gastroCoinStackHeaderTitle(t('order.title'), 'light'),
          headerBackTitle: t('nav.back'),
          headerBackVisible: true,
          ...(Platform.OS === 'ios' ? { headerBackTitleVisible: true } : {}),
          headerStyle: { backgroundColor: ONLINE_ORDER_PAGE_BG },
          headerTintColor: GastroColorsOnlineOrder.text,
          headerShadowVisible: false,
        }}
      />
      <Screen scroll edges={['left', 'right', 'bottom']} backgroundColor={ONLINE_ORDER_PAGE_BG} style={styles.page}>
        <OnlineOrderVoiceSearchBar
          tone="light"
          initialDraft={voiceSearchDraft}
          searching={screen.voiceSearching}
          onSearch={(query) => void screen.runVoiceSearch(query)}
        />

        <View style={styles.section}>
          <Text style={styles.kitchensTitle}>{t('order.kitchenLabel')}</Text>
          <OnlineOrderKitchenChips
            categories={categories}
            selectedSlugs={screen.slugs}
            onToggle={(slug) => screen.setSlugs((prev) => toggleKitchenSlug(prev, slug))}
            onClear={() => screen.setSlugs([])}
          />
        </View>

        <View style={styles.filterPanel}>
          <FilterRangeBar
            tone="light"
            label={t('order.filterDistance')}
            value={screen.maxDistanceKm}
            min={0}
            max={MAX_DISTANCE_KM}
            step={0.1}
            formatValue={(km) => (km <= 0 ? '0 km' : `${km.toFixed(1)} km`)}
            onChange={screen.setMaxDistanceKm}
          />

          <FilterRangeBar
            tone="light"
            label={t('order.filterMinRating')}
            value={screen.minRating}
            min={ONLINE_ORDER_MIN_RATING}
            max={MAX_RATING}
            step={0.1}
            formatValue={(stars) => `${stars.toFixed(1)} ★`}
            onChange={screen.setMinRating}
          />
          <Text style={styles.ratingHint}>{t('order.filterRatingHint')}</Text>

          {screen.usingFallbackCoords ? (
            <Text style={styles.coordsHint}>
              {t('order.locationFallback', { city: cityLabel })}
            </Text>
          ) : null}
        </View>

        {screen.listMode === 'voice' && screen.voiceQuery ? (
          <OnlineOrderVoiceResultBanner
            voiceQuery={screen.voiceQuery}
            voiceSearchExpanded={screen.voiceSearchExpanded}
            cityLabel={cityLabel}
            voiceRestaurantOptions={screen.voiceRestaurantOptions}
            itemsCount={screen.items.length}
            onEditSearch={screen.openVoiceSheet}
            onOpenCommand={() => screen.setVoiceCommandOpen(true)}
            onExitVoice={screen.exitVoiceMode}
          />
        ) : null}

        <OnlineOrderListSection
          items={screen.items}
          loading={screen.loading}
          error={screen.error}
          sortMode={screen.sortMode}
          onSortChange={screen.setSortMode}
          voiceLetterById={screen.voiceLetterById}
          showProductPrice={screen.showProductPriceOnCards}
          onRetry={screen.reloadBrowse}
          onWidenDistance={() => screen.widenDistance(MAX_DISTANCE_KM)}
          onClearSlugs={screen.clearSlugs}
                    emptyTitle={
            screen.listMode === 'voice' && screen.voiceQuery
              ? t('order.voiceNoMatch')
              : undefined
          }
          emptySub={
            screen.listMode === 'voice' && screen.voiceQuery
              ? t('order.voiceNoMatchHint', { summary: formatVoiceOrderSummary(screen.voiceQuery) })
              : undefined
          }
          voiceEmptyActions={voiceEmptyActions}
        />
      </Screen>

      <VoiceOrderSheet
        visible={screen.voiceSheetOpen}
        searching={screen.voiceSearching}
        onClose={() => screen.setVoiceSheetOpen(false)}
        onSearch={(query) => void screen.onVoiceSearch(query)}
      />

      <VoiceOrderConfirmSheet
        visible={screen.voiceConfirmOpen}
        command={screen.voiceOrderCommand}
        restaurant={screen.voiceConfirmRestaurant}
        userEmail={user?.email ?? null}
        initialSelectedByLine={screen.voiceCartSelections}
        onClose={() => {
          screen.setVoiceConfirmOpen(false);
          screen.setVoiceCartSelections({});
        }}
        onSuccess={() => {
          screen.setVoiceOrderCommand(null);
          screen.setVoiceConfirmRestaurant(null);
          screen.setVoiceCartSelections({});
        }}
      />

      <Modal
        visible={screen.voiceCommandOpen}
        animationType="slide"
        transparent
        onRequestClose={() => screen.setVoiceCommandOpen(false)}>
        <View style={styles.commandModal}>
          <Pressable
            style={styles.commandBackdrop}
            onPress={() => screen.setVoiceCommandOpen(false)}
          />
          <View style={styles.commandSheet}>
            {screen.voiceCommandOpen ? (
              <VoiceOrderCommandBar
                restaurants={screen.voiceRestaurantOptions}
                defaultProductSearchGroup={screen.voiceQuery?.voiceProduct}
                onSubmit={(command) => {
                  void screen.onVoiceOrderCommand(command);
                }}
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(
  colors: import('@/constants/theme').GastroColorScheme,
  _shadow: import('@/constants/theme').GastroShadowScheme,
) {
  const ink = GastroColorsOnlineOrder;
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: ONLINE_ORDER_PAGE_BG },
    page: { gap: 20, paddingTop: 4 },
    section: { gap: 8 },
    kitchensTitle: {
      color: ink.text,
      fontSize: 15,
      fontWeight: '800',
    },
    filterPanel: {
      gap: 14,
      paddingTop: 4,
      borderTopWidth: 1,
      borderTopColor: ink.border,
    },
    coordsHint: { color: ink.muted, fontSize: 12, lineHeight: 17 },
    ratingHint: { color: ink.muted, fontSize: 12, lineHeight: 17, marginTop: -6 },
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
    emptyBtn: {
      borderRadius: 12,
      backgroundColor: ink.accent,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    emptyBtnText: { color: ink.accentDark, fontWeight: '800', fontSize: 13 },
    emptyBtnGhost: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: ink.border,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    emptyBtnGhostText: { color: ink.muted, fontWeight: '700', fontSize: 13 },
  });
}

