import { Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ReservationRestaurantCard } from '@/components/ReservationRestaurantCard';
import { ReservationListAmbienceHost } from '@/components/reservation/ReservationAmbienceHost';
import { ReservationListHero } from '@/components/reservation/ReservationListHero';
import { Screen } from '@/components/ui/Screen';
import { ReservationTheme } from '@/constants/reservation-theme';
import { RESERVATION_VITRIN_PREVIEW_RESTAURANT } from '@/constants/reservation-vitrin-preview';
import { ONLINE_ORDER_MIN_RATING } from '@/constants/online-orders';
import { useCity } from '@/context/city-context';
import { getRestaurantReservationActive, listOnlineOrderRestaurants } from '@/lib/api';
import { formatApiError } from '@/lib/format-api-error';
import { formatDistanceLabel } from '@/lib/travel-estimate';
import type { RestaurantListItem } from '@/lib/types';

type ReservationListRow = {
  restaurant: RestaurantListItem;
  floorBackgroundUrl: string | null;
};

export default function OnlineReservationOpenScreen() {
  const { city, cityLabel } = useCity();
  const styles = useMemo(() => createStyles(), []);
  const { t } = useTranslation();

  const [items, setItems] = useState<ReservationListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listOnlineOrderRestaurants({
        city,
        limit: 80,
        min_rating: ONLINE_ORDER_MIN_RATING,
      });
      const open = res.items.filter((row) => row.reservation_vitrin_listed);
      const enriched = await Promise.all(
        open.map(async (restaurant) => {
          try {
            const active = await getRestaurantReservationActive(restaurant.id);
            return {
              restaurant,
              floorBackgroundUrl: active.floor_plan?.background_url ?? null,
            };
          } catch {
            return { restaurant, floorBackgroundUrl: null };
          }
        }),
      );
      setItems(enriched);
    } catch (err) {
      setError(formatApiError(err, t('rezervasyon.loadError')));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [city]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen scroll={false} style={styles.root}>
      <ReservationListAmbienceHost />
      <Stack.Screen
        options={{
          headerTitle: t('rezervasyon.title'),
          headerBackTitle: t('rezervasyon.back'),
          headerStyle: { backgroundColor: ReservationTheme.bg },
          headerTintColor: ReservationTheme.text,
          headerShadowVisible: false,
          ...(Platform.OS === 'ios' ? { headerBackTitleVisible: true } : {}),
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ReservationListHero cityLabel={cityLabel} openCount={loading ? null : items.length} />

        {loading ? (
          <ActivityIndicator color={ReservationTheme.accent} style={{ marginTop: 24 }} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => void load()}>
              <Text style={styles.retryText}>{t('rezervasyon.retry')}</Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <>
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>{t('rezervasyon.emptyTitle')}</Text>
              <Text style={styles.emptyBody}>
                {t('rezervasyon.emptyBody')}
              </Text>
              <View style={styles.steps}>
                <Text style={styles.step}>{t('rezervasyon.pilotStep1')}</Text>
                <Text style={styles.step}>{t('rezervasyon.pilotStep2')}</Text>
                <Text style={styles.step}>{t('rezervasyon.pilotStep3')}</Text>
              </View>
            </View>

            <View style={styles.previewSection}>
              <Text style={styles.previewTitle}>{t('rezervasyon.vitrinPreview')}</Text>
              <Text style={styles.previewHint}>
                {t('rezervasyon.vitrinPreviewHint')}
              </Text>
              <ReservationRestaurantCard
                restaurant={RESERVATION_VITRIN_PREVIEW_RESTAURANT}
                preview
                href="/online-rezervasyon/masa/vitrin-preview-atlas-sofra"
                googleRating={RESERVATION_VITRIN_PREVIEW_RESTAURANT.google_rating}
                googleReviewCount={RESERVATION_VITRIN_PREVIEW_RESTAURANT.google_review_count}
                distanceLabel="1,2 km"
              />
            </View>
          </>
        ) : (
          items.map(({ restaurant, floorBackgroundUrl }) => (
            <ReservationRestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              floorBackgroundUrl={floorBackgroundUrl}
              href={`/online-rezervasyon/masa/${restaurant.id}`}
              googleRating={restaurant.google_rating}
              googleReviewCount={restaurant.google_review_count}
              distanceLabel={
                formatDistanceLabel({ distance_meters: restaurant.distance_meters }) ?? undefined
              }
            />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function createStyles() {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: ReservationTheme.bg },
    scroll: { padding: 16, gap: 12, paddingBottom: 32 },
    emptyBox: {
      marginTop: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: ReservationTheme.borderSoft,
      backgroundColor: ReservationTheme.panel,
      padding: 16,
      gap: 8,
    },
    emptyTitle: { color: ReservationTheme.text, fontSize: 16, fontWeight: '800' },
    emptyBody: { color: ReservationTheme.textMuted, fontSize: 13, lineHeight: 19 },
    steps: { gap: 6, marginTop: 4 },
    step: { color: ReservationTheme.textSoft, fontSize: 12, lineHeight: 18 },
    previewSection: { gap: 8, marginTop: 4 },
    previewTitle: { color: ReservationTheme.text, fontSize: 15, fontWeight: '800' },
    previewHint: { color: ReservationTheme.textMuted, fontSize: 12, lineHeight: 17 },
    errorBox: {
      marginTop: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(239,68,68,0.35)',
      backgroundColor: 'rgba(239,68,68,0.08)',
      padding: 14,
      gap: 10,
    },
    errorText: { color: ReservationTheme.text, fontSize: 13 },
    retryBtn: {
      alignSelf: 'flex-start',
      backgroundColor: ReservationTheme.accent,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    retryText: { color: ReservationTheme.ctaText, fontWeight: '800', fontSize: 13 },
  });
}
