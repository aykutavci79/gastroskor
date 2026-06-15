import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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

function statusLabel(status: RestaurantOrderRead['status']) {
  if (status === 'pending') return 'Bekliyor';
  if (status === 'accepted') return 'Onaylandi';
  return 'Reddedildi';
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

function friendlyOrdersError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  if (/Kullanici bulunamadi/i.test(raw)) {
    return 'Hesap senkronize edilemedi. Cikis yapip tekrar Google ile giris yap.';
  }
  if (/401|Oturum|Unauthorized|yetkisiz/i.test(raw)) {
    return 'Oturum suresi dolmus olabilir. Cikis yapip tekrar giris yap.';
  }
  if (/Not Found|404|bulunamadi|henuz aktif/i.test(raw)) {
    return 'Siparis listesi sunucuda henuz acilmadi. Uygulama guncel; backend guncellemesi yakin.';
  }
  if (/network|baglanti|ulasilamadi/i.test(raw)) {
    return 'Internet veya sunucu baglantisi kurulamadi. Biraz sonra tekrar dene.';
  }
  return 'Siparisler su an yuklenemedi. Asagi cekip yenile veya birkac dakika sonra dene.';
}

export default function SiparislerimScreen() {
  const router = useRouter();
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
    [user?.email],
  );

  useFocusEffect(
    useCallback(() => {
      load({ silent: !firstFocus.current });
      firstFocus.current = false;
    }, [load]),
  );

  if (!user?.email) {
    return (
      <Screen scroll edges={['left', 'right']}>
        <View style={styles.hero}>
          <Text style={styles.title}>Siparislerim</Text>
          <Text style={styles.sub}>
            Online siparis gecmisin ve bekleyen siparislerin burada listelenir.
          </Text>
        </View>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Giris gerekli</Text>
          <Text style={styles.muted}>
            Siparislerini gormek icin Google hesabinla giris yap.
          </Text>
          {isExpoGo ? (
            <Text style={styles.expoNote}>
              Expo Go&apos;da Google girisi calismaz. Play dahili test veya TestFlight build kullan.
            </Text>
          ) : (
            <GoogleSignInButton onError={() => undefined} />
          )}
          <Pressable style={styles.btnOutline} onPress={() => router.push('/(tabs)/profil' as never)}>
            <Text style={styles.btnOutlineText}>Hesap ayarlari</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      edges={['left', 'right']}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load({ silent: true });
      }}>
      <View style={styles.hero}>
        <Text style={styles.title}>Siparislerim</Text>
        <Text style={styles.sub}>
          {pendingCount > 0
            ? `${pendingCount} bekleyen siparis · ${total} kayit`
            : total > 0
              ? `${total} siparis`
              : 'Online siparis gecmisin burada gorunur.'}
        </Text>
      </View>

      {loading && items.length === 0 ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      ) : error && items.length === 0 ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Liste su an acilamiyor</Text>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.btnOutline} onPress={() => load()}>
            <Text style={styles.btnOutlineText}>Tekrar dene</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Henuz siparis yok</Text>
          <Text style={styles.muted}>
            Online Siparis akisindan verdigin siparisler burada listelenir.
          </Text>
          <Pressable style={styles.btnOutline} onPress={() => router.push('/siparis-acik' as never)}>
            <Text style={styles.btnOutlineText}>Online Siparis</Text>
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
                      {order.restaurant_name ?? 'Restoran'}
                    </Text>
                    <View
                      style={[
                        styles.statusPill,
                        { borderColor: statusColor(order.status, colors) },
                      ]}>
                      <Text style={[styles.statusText, { color: statusColor(order.status, colors) }]}>
                        {statusLabel(order.status)}
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
                    <Text style={styles.link}>Detay</Text>
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
                      <Text style={styles.secondaryLinkText}>Restorani ac</Text>
                    </Pressable>
                  ) : null}
                  {order.can_review ? (
                    <Pressable style={styles.rateBtn} onPress={() => setRatingOrder(order)}>
                      <Text style={styles.rateBtnText}>Puan ver</Text>
                    </Pressable>
                  ) : order.has_review ? (
                    <Text style={styles.ratedHint}>Puanlandi</Text>
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
