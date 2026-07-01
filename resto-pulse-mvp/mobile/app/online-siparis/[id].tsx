import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GastroCoinHeaderTitle, gastroCoinStackHeaderTitle } from '@/components/GastroCoinHeaderTitle';
import { OnlineOrderDetailScreen } from '@/components/online-order-detail/OnlineOrderDetailScreen';
import { GastroColorsLight } from '@/constants/theme';
import { useSession } from '@/context/session-context';
import { getRestaurant } from '@/lib/api';
import { formatApiError } from '@/lib/format-api-error';
import type { Restaurant } from '@/lib/types';

const PAGE_BG = '#FFFFFF';

export default function OnlineOrderDetailRoute() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { user } = useSession();

  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const dmRaw = Array.isArray(params.dm) ? params.dm[0] : params.dm;
  const grRaw = Array.isArray(params.gr) ? params.gr[0] : params.gr;
  const distanceMeters = dmRaw != null && dmRaw !== '' ? Number(dmRaw) : null;
  const googleRating = grRaw != null && grRaw !== '' ? Number(grRaw) : null;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setError(t('order.notFoundError'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getRestaurant(id);
      setRestaurant(data);
    } catch (err) {
      setError(formatApiError(err, t('order.loadError')));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const headerTitle = useMemo(() => {
    const name = restaurant?.name?.trim();
    if (!name) {
      return gastroCoinStackHeaderTitle(t('order.fallbackTitle'), 'light');
    }
    function OnlineOrderDetailHeaderTitle() {
      return <GastroCoinHeaderTitle title={name} tone="light" numberOfLines={1} />;
    }
    OnlineOrderDetailHeaderTitle.displayName = 'OnlineOrderDetailHeaderTitle';
    return OnlineOrderDetailHeaderTitle;
  }, [restaurant?.name]);

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          headerTitle,
          headerBackTitle: t('nav.back'),
          headerBackVisible: true,
          ...(Platform.OS === 'ios' ? { headerBackTitleVisible: true } : {}),
          headerStyle: { backgroundColor: PAGE_BG },
          headerTintColor: GastroColorsLight.text,
          headerShadowVisible: false,
        }}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#FF6B35" size="large" />
        </View>
      ) : error || !restaurant ? (
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <Text style={styles.errorTitle}>{error ?? t('order.notFoundTitle')}</Text>
          <Pressable style={styles.retryBtn} onPress={() => void load()}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </Pressable>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backLink}>{t('order.goBack')}</Text>
          </Pressable>
        </View>
      ) : (
        <OnlineOrderDetailScreen
          restaurant={restaurant}
          userEmail={user?.email ?? null}
          distanceMeters={Number.isFinite(distanceMeters) ? distanceMeters : null}
          googleRating={Number.isFinite(googleRating) ? googleRating : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  errorTitle: { color: GastroColorsLight.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  retryBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryText: { color: '#141414', fontWeight: '800' },
  backLink: { color: '#FF6B35', fontWeight: '700', marginTop: 8 },
});
