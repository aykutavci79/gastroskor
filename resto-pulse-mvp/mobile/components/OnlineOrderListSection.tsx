import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { OnlineOrderRestaurantCard } from '@/components/OnlineOrderRestaurantCard';
import { OnlineOrderSortBar } from '@/components/OnlineOrderSortBar';
import { GastroColorsOnlineOrder } from '@/constants/online-order-theme';
import { useGastroTheme } from '@/context/theme-context';
import { onlineOrderDetailHref } from '@/lib/online-order-detail-route';
import type { OnlineOrderSortMode } from '@/lib/online-order-sort';
import { formatDistanceLabel } from '@/lib/travel-estimate';
import type { RestaurantListItem } from '@/lib/types';

type Props = {
  items: RestaurantListItem[];
  loading: boolean;
  error: string | null;
  sortMode: OnlineOrderSortMode;
  onSortChange: (mode: OnlineOrderSortMode) => void;
  voiceLetterById: Map<string, string>;
  showProductPrice: boolean;
  onRetry: () => void;
  emptyTitle?: string;
  emptySub?: string;
  onWidenDistance: () => void;
  onClearSlugs: () => void;
  voiceEmptyActions?: React.ReactNode;
};

export function OnlineOrderListSection({
  items,
  loading,
  error,
  sortMode,
  onSortChange,
  voiceLetterById,
  showProductPrice,
  onRetry,
    emptyTitle,
  emptySub,
  onWidenDistance,
  onClearSlugs,
  voiceEmptyActions,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useGastroTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const resolvedEmptyTitle = emptyTitle ?? t('order.emptyListTitle');
  const resolvedEmptySub = emptySub ?? t('order.emptyListHint');

  return (
    <View style={styles.wrap}>
      {!loading && items.length > 0 ? (
        <OnlineOrderSortBar tone="light" value={sortMode} onChange={onSortChange} />
      ) : null}

      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>{t('order.restaurants')}</Text>
        {!loading ? <Text style={styles.resultCount}>{t('order.venueCount', { count: items.length })}</Text> : null}
      </View>

      {loading ? (
        <View style={styles.skeletonList}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.skeleton} />
          ))}
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={onRetry}>
            <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>{resolvedEmptyTitle}</Text>
          <Text style={styles.emptySub}>{resolvedEmptySub}</Text>
          <View style={styles.emptyActions}>
            {voiceEmptyActions ?? (
              <>
                <Pressable style={styles.emptyBtn} onPress={onWidenDistance}>
                  <Text style={styles.emptyBtnText}>{t('order.expandDistance')}</Text>
                </Pressable>
                <Pressable style={styles.emptyBtnGhost} onPress={onClearSlugs}>
                  <Text style={styles.emptyBtnGhostText}>{t('order.clearKitchen')}</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <View style={styles.list}>
          {items.map((restaurant) => {
            const distanceLabel =
              restaurant.distance_meters != null
                ? formatDistanceLabel({ distance_meters: restaurant.distance_meters })
                : undefined;
            const href = onlineOrderDetailHref(restaurant.id, {
              distanceMeters: restaurant.distance_meters,
              googleRating: restaurant.google_rating,
            });
            return (
              <OnlineOrderRestaurantCard
                key={restaurant.id}
                tone="light"
                restaurant={restaurant}
                href={String(href)}
                distanceLabel={distanceLabel}
                googleRating={restaurant.google_rating}
                voiceMatches={restaurant.voice_menu_matches}
                voiceLetter={voiceLetterById.get(restaurant.id) ?? null}
                showProductPrice={showProductPrice}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: import('@/constants/theme').GastroColorScheme) {
  const ink = GastroColorsOnlineOrder;
  return StyleSheet.create({
    wrap: { gap: 10 },
    listHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 8,
    },
    sectionTitle: { color: ink.text, fontSize: 17, fontWeight: '800' },
    resultCount: { color: ink.muted, fontSize: 13, fontWeight: '700' },
    skeletonList: { gap: 10 },
    skeleton: {
      height: 88,
      borderRadius: 16,
      backgroundColor: ink.input,
      borderWidth: 1,
      borderColor: ink.border,
    },
    list: { gap: 10 },
    errorBox: { gap: 8 },
    error: { color: colors.bad, fontSize: 13 },
    retryBtn: {
      alignSelf: 'flex-start',
      borderRadius: 12,
      backgroundColor: ink.accent,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    retryBtnText: { color: ink.accentDark, fontWeight: '800', fontSize: 13 },
    emptyBox: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: ink.border,
      backgroundColor: ink.panel,
      padding: 16,
      gap: 6,
    },
    emptyTitle: { color: ink.text, fontSize: 16, fontWeight: '700' },
    emptySub: { color: ink.muted, fontSize: 13, lineHeight: 18 },
    emptyActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
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

