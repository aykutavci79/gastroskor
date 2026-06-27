import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { gastroCoinStackHeaderTitle } from '@/components/GastroCoinHeaderTitle';
import { OrderRatingSheet } from '@/components/OrderRatingSheet';
import { Screen } from '@/components/ui/Screen';
import { GastroStyles } from '@/constants/theme';
import type { GastroColorScheme } from '@/constants/theme';
import { useGastroTheme } from '@/context/theme-context';
import { useSession } from '@/context/session-context';
import { getUserOrder } from '@/lib/api';
import { formatPriceTl } from '@/lib/format-price-tl';
import type { RestaurantOrderRead } from '@/lib/types';
import { restaurantDetailHref } from '@/lib/uuid';

function formatWhen(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
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

function friendlyOrderError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  if (/404|bulunamadi/i.test(raw)) return 'Siparis bulunamadi.';
  if (/401|Oturum|Unauthorized/i.test(raw)) return 'Oturum suresi dolmus olabilir. Tekrar giris yap.';
  return 'Siparis detayi yuklenemedi. Biraz sonra tekrar dene.';
}

export default function SiparisDetayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useSession();
  const { colors } = useGastroTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [order, setOrder] = useState<RestaurantOrderRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratingOpen, setRatingOpen] = useState(false);

  const load = useCallback(() => {
    if (!user?.email || !orderId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getUserOrder(user.email, orderId)
      .then((data) => {
        setOrder(data);
        setError(null);
      })
      .catch((err) => {
        setOrder(null);
        setError(friendlyOrderError(err));
      })
      .finally(() => setLoading(false));
  }, [orderId, user?.email]);

  useEffect(() => {
    load();
  }, [load]);

  const restaurantHref = order
    ? restaurantDetailHref({ id: order.restaurant_id, restaurant_id: order.restaurant_id })
    : null;

  if (!user?.email) {
    return (
      <>
        <Stack.Screen options={{ headerTitle: gastroCoinStackHeaderTitle('Sipariş detayı') }} />
        <Screen scroll edges={['left', 'right']}>
        <Text style={styles.muted}>Siparis detayi icin giris yap.</Text>
        <Pressable style={styles.btnOutline} onPress={() => router.push('/(tabs)/profil' as never)}>
          <Text style={styles.btnOutlineText}>Hesaba git</Text>
        </Pressable>
      </Screen>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerTitle: gastroCoinStackHeaderTitle('Sipariş detayı') }} />
        <Screen edges={['left', 'right']}>
          <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
        </Screen>
      </>
    );
  }

  if (error || !order) {
    return (
      <>
        <Stack.Screen options={{ headerTitle: gastroCoinStackHeaderTitle('Sipariş detayı') }} />
        <Screen scroll edges={['left', 'right']}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Detay acilamadi</Text>
          <Text style={styles.error}>{error ?? 'Siparis bulunamadi.'}</Text>
          <Pressable style={styles.btnOutline} onPress={load}>
            <Text style={styles.btnOutlineText}>Tekrar dene</Text>
          </Pressable>
        </View>
      </Screen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerTitle: gastroCoinStackHeaderTitle('Sipariş detayı') }} />
      <Screen scroll edges={['left', 'right']}>
      <View style={styles.hero}>
        <View
          style={[
            styles.statusPill,
            { borderColor: statusColor(order.status, colors), backgroundColor: `${statusColor(order.status, colors)}18` },
          ]}>
          <Text style={[styles.statusText, { color: statusColor(order.status, colors) }]}>
            {statusLabel(order.status)}
          </Text>
        </View>
        <Text style={styles.when}>{formatWhen(order.created_at)}</Text>
        {order.order_number ? <Text style={styles.orderNo}>{order.order_number}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Restoran</Text>
        <Pressable
          disabled={!restaurantHref}
          onPress={() => {
            if (restaurantHref) router.push(restaurantHref as never);
          }}>
          <Text style={[styles.restaurantName, restaurantHref && styles.link]}>
            {order.restaurant_name ?? 'Restoran'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Kalemler</Text>
        {order.lines.map((line) => (
          <View key={line.id} style={styles.lineRow}>
            <Text style={styles.lineName} numberOfLines={2}>
              {line.quantity}x {line.name}
            </Text>
            <Text style={styles.linePrice}>
              {formatPriceTl(line.line_total_tl, 0) ?? '—'} TL
            </Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Toplam</Text>
          <Text style={styles.totalValue}>{formatPriceTl(order.total_tl, 0) ?? '—'} TL</Text>
        </View>
      </View>

      {order.note?.trim() ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Not</Text>
          <Text style={styles.noteText}>{order.note.trim()}</Text>
        </View>
      ) : null}

      {order.customer_address?.trim() ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Adres</Text>
          <Text style={styles.noteText}>{order.customer_address.trim()}</Text>
        </View>
      ) : null}

      {order.status === 'rejected' ? (
        <View style={styles.rejectCard}>
          <Text style={styles.rejectTitle}>Red mesaji</Text>
          {order.reject_reason_label ? (
            <Text style={styles.rejectReason}>{order.reject_reason_label}</Text>
          ) : null}
          <Text style={styles.rejectMessage}>
            {order.reject_message?.trim() || 'Restoran siparisi reddetti.'}
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        {restaurantHref ? (
          <Pressable
            style={styles.btnPrimary}
            onPress={() =>
              router.push({
                pathname: '/restaurant/[id]',
                params: { id: order.restaurant_id, focus: 'menu' },
              } as never)
            }>
            <Text style={styles.btnPrimaryText}>Tekrarla</Text>
          </Pressable>
        ) : null}
        {order.can_review ? (
          <Pressable style={styles.btnOutline} onPress={() => setRatingOpen(true)}>
            <Text style={styles.btnOutlineText}>Puan ver</Text>
          </Pressable>
        ) : order.has_review ? (
          <Text style={styles.ratedHint}>Bu siparis puanlandi.</Text>
        ) : null}
      </View>

      <OrderRatingSheet
        visible={ratingOpen}
        order={order}
        userEmail={user.email}
        onClose={() => setRatingOpen(false)}
        onSubmitted={() => {
          setRatingOpen(false);
          load();
        }}
      />
    </Screen>
    </>
  );
}

function createStyles(colors: GastroColorScheme) {
  return StyleSheet.create({
    hero: { gap: 6, marginBottom: 12 },
    statusPill: {
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    statusText: { fontSize: 14, fontWeight: '800' },
    when: { color: colors.muted, fontSize: 13 },
    orderNo: { color: colors.text, fontSize: 13, fontWeight: '700' },
    card: {
      ...GastroStyles.card,
      gap: 8,
      marginBottom: 10,
    },
    sectionLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    restaurantName: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    link: { ...GastroStyles.linkText },
    lineRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    lineName: { color: colors.text, fontSize: 14, flex: 1, lineHeight: 20 },
    linePrice: { color: colors.text, fontSize: 14, fontWeight: '700' },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    totalLabel: { color: colors.muted, fontSize: 13, fontWeight: '600' },
    totalValue: { color: colors.text, fontSize: 18, fontWeight: '800' },
    noteText: { color: colors.text, fontSize: 14, lineHeight: 20 },
    rejectCard: {
      ...GastroStyles.card,
      gap: 6,
      marginBottom: 10,
      borderColor: colors.border,
      backgroundColor: `${colors.muted}12`,
    },
    rejectTitle: { color: colors.text, fontWeight: '800', fontSize: 14 },
    rejectReason: { color: colors.muted, fontSize: 13, fontWeight: '600' },
    rejectMessage: { color: colors.text, fontSize: 13, lineHeight: 18 },
    actions: { gap: 10, marginTop: 4, marginBottom: 16 },
    btnPrimary: {
      ...GastroStyles.btnPrimary,
      alignItems: 'center',
    },
    btnPrimaryText: GastroStyles.btnPrimaryText,
    btnOutline: {
      ...GastroStyles.btnOutline,
      alignItems: 'center',
    },
    btnOutlineText: GastroStyles.btnOutlineText,
    ratedHint: { color: colors.muted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    muted: { color: colors.muted, fontSize: 13 },
    error: { ...GastroStyles.errorText, marginTop: 0, lineHeight: 20, textAlign: 'center' },
    errorCard: {
      ...GastroStyles.card,
      gap: 10,
      marginTop: 12,
      alignItems: 'center',
    },
    errorTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
  });
}
