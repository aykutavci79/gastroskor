import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { gastroCoinStackHeaderTitle } from '@/components/GastroCoinHeaderTitle';
import { OrderRatingSheet } from '@/components/OrderRatingSheet';
import { Screen } from '@/components/ui/Screen';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { GastroStyles } from '@/constants/theme';
import type { GastroColorScheme } from '@/constants/theme';
import { useGastroTheme } from '@/context/theme-context';
import { useSession } from '@/context/session-context';
import { listUserOrders } from '@/lib/api';
import { formatPriceTl } from '@/lib/format-price-tl';
import { isExpoGo } from '@/lib/google-signin-config';
import type { RestaurantOrderRead } from '@/lib/types';
import { restaurantDetailHref } from '@/lib/uuid';

function formatWhen(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusColor(status: RestaurantOrderRead['status'], colors: GastroColorScheme) {
  if (status === 'pending') return colors.accent;
  if (status === 'accepted') return '#3ecf8e';
  return colors.muted;
}

function summarizeLines(order: RestaurantOrderRead) {
  const parts = order.lines.slice(0, 3).map((line) => `${line.quantity}x ${line.name}`);
  if (order.lines.length > 3) parts.push('...');
  return parts.join(' · ');
}

export default function SiparislerimScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useSession();
  const { colors } = useGastroTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState<RestaurantOrderRead[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ratingOrder, setRatingOrder] = useState<RestaurantOrderRead | null>(null);
  const firstFocus = useRef(true);
  const loadSeq = useRef(0);
  const hasItemsRef = useRef(false);

  function friendlyOrdersError(err: unknown): string {
    const raw = err instanceof Error ? err.message : String(err ?? '');
    if (/Kullanici bulunamadi/i.test(raw)) return t('orders.errorAccount');
    if (/401|Oturum|Unauthorized|yetkisiz/i.test(raw)) return t('orders.errorSession');
    if (/Not Found|404|bulunamadi|henuz aktif/i.test(raw)) return t('orders.errorNotFound');
    if (/network|baglanti|ulasilamadi/i.test(raw)) return t('orders.errorNetwork');
    return t('orders.errorGeneric');
  }

  const load = useCallback(
    (opts?: { silent?: boolean }) => {
      if (!user?.email) {
        setLoading(false);
        return;
      }
      const seq = ++loadSeq.current;
      const silent = Boolean(opts?.silent);
      if (!silent && !hasItemsRef.current) {
        setLoading(true);
      }
      if (!silent) {
        setError(null);
      }
      listUserOrders(user.email, { limit: 40 })
        .then((data) => {
          if (seq !== loadSeq.current) return;
          hasItemsRef.current = data.items.length > 0;
          setItems(data.items);
          setPendingCount(data.pending_count);
          setTotal(data.total);
          setError(null);
        })
        .catch((err) => {
          if (seq !== loadSeq.current) return;
          if (!hasItemsRef.current) {
            setItems([]);
            setPendingCount(0);
            setTotal(0);
            setError(friendlyOrdersError(err));
          }
        })
        .finally(() => {
          if (seq !== loadSeq.current) return;
          setLoading(false);
          setRefreshing(false);
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.email, t],
  );

  useFocusEffect(
    useCallback(() => {
      load({ silent: !firstFocus.current });
      firstFocus.current = false;
    }, [load]),
  );

  if (!user?.email) {
    return (
      <>
        <Stack.Screen options={{ headerTitle: gastroCoinStackHeaderTitle(t('orders.title')) }} />
        <Screen scroll edges={['left', 'right']}>
          <View style={styles.hero}>
            <Text style={styles.title}>{t('orders.title')}</Text>
            <Text style={styles.sub}>{t('orders.sub')}</Text>
          </View>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t('auth.loginRequired')}</Text>
            <Text style={styles.muted}>{t('auth.loginToViewOrders')}</Text>
            {isExpoGo ? (
              <Text style={styles.expoNote}>{t('auth.loginExpoGoNote')}</Text>
            ) : (
              <GoogleSignInButton consentAccepted={false} onError={() => undefined} />
            )}
            <Pressable style={styles.btnOutline} onPress={() => router.push('/(tabs)/profil' as never)}>
              <Text style={styles.btnOutlineText}>{t('orders.settings')}</Text>
            </Pressable>
          </View>
        </Screen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerTitle: gastroCoinStackHeaderTitle(t('orders.title')) }} />
      <Screen
        scroll
        edges={['left', 'right']}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          load({ silent: true });
        }}>
        <View style={styles.hero}>
          <Text style={styles.title}>{t('orders.title')}</Text>
          <Text style={styles.sub}>
            {pendingCount > 0
              ? t('orders.pendingSummary', { count: pendingCount, total })
              : total > 0
                ? t('orders.totalSummary', { total })
                : t('orders.empty')}
          </Text>
        </View>

        {loading && items.length === 0 ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
        ) : error && items.length === 0 ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>{t('orders.errorTitle')}</Text>
            <Text style={styles.error}>{error}</Text>
            <Pressable style={styles.btnOutline} onPress={() => load()}>
              <Text style={styles.btnOutlineText}>{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t('orders.emptyTitle')}</Text>
            <Text style={styles.muted}>{t('orders.emptyHint')}</Text>
            <Pressable style={styles.btnOutline} onPress={() => router.push('/siparis-acik' as never)}>
              <Text style={styles.btnOutlineText}>{t('order.title')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((order) => {
              const restaurantHref = restaurantDetailHref({
                id: order.restaurant_id,
                restaurant_id: order.restaurant_id,
              });
              return (
                <View key={order.id} style={styles.card}>
                  <Pressable
                    style={({ pressed }) => [pressed && styles.cardPressed]}
                    onPress={() => router.push(`/siparis/${order.id}` as never)}>
                    <View style={styles.cardTop}>
                      <Text style={styles.restaurantName} numberOfLines={1}>
                        {order.restaurant_name ?? t('orders.defaultRestaurant')}
                      </Text>
                      <View
                        style={[
                          styles.statusPill,
                          { borderColor: statusColor(order.status, colors) },
                        ]}>
                        <Text style={[styles.statusText, { color: statusColor(order.status, colors) }]}>
                          {order.status === 'pending'
                            ? t('orders.statusPending')
                            : order.status === 'accepted'
                              ? t('orders.statusAccepted')
                              : t('orders.statusRejected')}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.meta}>
                      {formatWhen(order.created_at)}
                      {order.order_number ? ` · ${order.order_number}` : ''}
                    </Text>
                    <Text style={styles.lines} numberOfLines={2}>
                      {summarizeLines(order)}
                    </Text>
                    <View style={styles.cardBottom}>
                      <Text style={styles.total}>
                        {formatPriceTl(order.total_tl, 0) ?? '—'} TL
                      </Text>
                      <Text style={styles.link}>{t('orders.detail')}</Text>
                    </View>
                    {order.status === 'rejected' && order.reject_message ? (
                      <Text style={styles.rejectNote} numberOfLines={2}>
                        {order.reject_message}
                      </Text>
                    ) : null}
                  </Pressable>
                  <View style={styles.cardActions}>
                    {restaurantHref ? (
                      <Pressable
                        style={styles.secondaryLink}
                        onPress={() => router.push(restaurantHref as never)}>
                        <Text style={styles.secondaryLinkText}>{t('orders.openRestaurant')}</Text>
                      </Pressable>
                    ) : null}
                    {order.can_review ? (
                      <Pressable style={styles.rateBtn} onPress={() => setRatingOrder(order)}>
                        <Text style={styles.rateBtnText}>{t('orders.rate')}</Text>
                      </Pressable>
                    ) : order.has_review ? (
                      <Text style={styles.ratedHint}>{t('orders.rated')}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}

      {user?.email ? (
        <OrderRatingSheet
          visible={ratingOrder != null}
          order={ratingOrder}
          userEmail={user.email}
          onClose={() => setRatingOrder(null)}
          onSubmitted={() => load({ silent: true })}
        />
      ) : null}
    </Screen>
    </>
  );
}

function createStyles(colors: GastroColorScheme) {
  return StyleSheet.create({
    hero: { gap: 4, marginBottom: 8 },
    title: { color: colors.text, fontSize: 22, fontWeight: '800' },
    sub: { color: colors.muted, fontSize: 13, lineHeight: 18 },
    muted: { color: colors.muted, fontSize: 13, lineHeight: 18 },
    error: { ...GastroStyles.errorText, marginTop: 0, lineHeight: 20, textAlign: 'center' },
    errorCard: {
      ...GastroStyles.card,
      gap: 10,
      marginTop: 12,
      alignItems: 'center',
    },
    errorTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
    emptyCard: {
      ...GastroStyles.card,
      gap: 10,
      marginTop: 8,
    },
    emptyTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
    list: { gap: 10 },
    card: {
      ...GastroStyles.card,
      gap: 6,
      paddingBottom: 10,
    },
    cardPressed: { opacity: 0.92 },
    rateBtn: {
      ...GastroStyles.btnOutline,
      marginTop: 4,
      paddingVertical: 10,
      alignItems: 'center',
    },
    rateBtnText: {
      ...GastroStyles.btnOutlineText,
      fontWeight: '800',
    },
    ratedHint: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 4,
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    restaurantName: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 15,
      flex: 1,
    },
    statusPill: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    statusText: { fontSize: 11, fontWeight: '700' },
    meta: { color: colors.muted, fontSize: 12 },
    lines: { color: colors.text, fontSize: 13, lineHeight: 18 },
    cardBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    total: { color: colors.text, fontWeight: '800', fontSize: 15 },
    link: { ...GastroStyles.linkText, fontSize: 12 },
    rejectNote: { color: colors.muted, fontSize: 12, lineHeight: 16 },
    cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: 4,
    },
    secondaryLink: { paddingVertical: 6 },
    secondaryLinkText: { ...GastroStyles.linkText, fontSize: 12 },
    expoNote: { color: colors.accent, fontSize: 12, lineHeight: 18 },
    btn: {
      ...GastroStyles.btnPrimary,
      marginTop: 12,
      padding: 14,
    },
    btnText: GastroStyles.btnPrimaryText,
    btnOutline: {
      ...GastroStyles.btnOutline,
      marginTop: 4,
      padding: 12,
      alignItems: 'center',
    },
    btnOutlineText: GastroStyles.btnOutlineText,
  });
}
