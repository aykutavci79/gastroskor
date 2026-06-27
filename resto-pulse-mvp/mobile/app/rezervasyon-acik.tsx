import { Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { RestaurantCard } from '@/components/RestaurantCard';
import { Screen } from '@/components/ui/Screen';
import { ONLINE_ORDER_MIN_RATING } from '@/constants/online-orders';
import { GastroColorsLight } from '@/constants/theme';
import { useCity } from '@/context/city-context';
import { useGastroTheme } from '@/context/theme-context';
import { listOnlineOrderRestaurants } from '@/lib/api';
import { formatApiError } from '@/lib/format-api-error';
import { formatDistanceLabel } from '@/lib/travel-estimate';
import type { RestaurantListItem } from '@/lib/types';

const PAGE_BG = '#FFFFFF';

export default function OnlineReservationOpenScreen() {
  const { city, cityLabel } = useCity();
  const { colors } = useGastroTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState<RestaurantListItem[]>([]);
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
      setItems(res.items.filter((row) => row.online_reservations_available));
    } catch (err) {
      setError(formatApiError(err, 'Rezervasyon listesi yüklenemedi.'));
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
      <Stack.Screen
        options={{
          headerTitle: 'Online Rezervasyon',
          headerBackTitle: 'Geri',
          headerStyle: { backgroundColor: PAGE_BG },
          headerTintColor: GastroColorsLight.text,
          headerShadowVisible: false,
          ...(Platform.OS === 'ios' ? { headerBackTitleVisible: true } : {}),
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>
          {cityLabel} · masa seç, talep gönder — restoran onayladıktan sonra çift onay ile kesinleşir.
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => void load()}>
              <Text style={styles.retryText}>Tekrar dene</Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Henüz rezervasyon alan restoran yok</Text>
            <Text style={styles.emptyBody}>
              Restoran panelinden online rezervasyon açılıp salon planı yayınlandığında burada listelenir.
            </Text>
          </View>
        ) : (
          items.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              href={`/online-rezervasyon/masa/${restaurant.id}`}
              googleRating={restaurant.google_rating}
              googleReviewCount={restaurant.google_review_count}
              distanceLabel={formatDistanceLabel({
                distance_meters: restaurant.distance_meters,
              }) ?? undefined}
            />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function createStyles(colors: import('@/constants/theme').GastroColorScheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: PAGE_BG },
    scroll: { padding: 16, gap: 12, paddingBottom: 32 },
    lead: { color: colors.muted, fontSize: 13, lineHeight: 19 },
    emptyBox: {
      marginTop: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.panel,
      padding: 16,
      gap: 8,
    },
    emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
    emptyBody: { color: colors.muted, fontSize: 13, lineHeight: 19 },
    errorBox: {
      marginTop: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(239,68,68,0.35)',
      backgroundColor: 'rgba(239,68,68,0.08)',
      padding: 14,
      gap: 10,
    },
    errorText: { color: colors.text, fontSize: 13 },
    retryBtn: {
      alignSelf: 'flex-start',
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    retryText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  });
}
