import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReservationTheme } from '@/constants/reservation-theme';
import { useSession } from '@/context/session-context';
import { confirmTableReservation, getMyTableReservation } from '@/lib/api';
import { formatApiError } from '@/lib/format-api-error';
import { reservationOccasionI18nKey } from '@/lib/reservation-occasion';
import type { TableReservationRead } from '@/lib/types';

const POLL_MS = 8000;

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function OnlineReservationStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reservationId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { user } = useSession();
  const styles = useMemo(() => createStyles(), []);
  const { t } = useTranslation();
  const [row, setRow] = useState<TableReservationRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function getStatusCopy(status: string): { title: string; body: string } {
    switch (status) {
      case 'pending_restaurant':
        return { title: t('rezervasyon.statusPending'), body: t('rezervasyon.statusPendingBody') };
      case 'approved_by_restaurant':
        return { title: t('rezervasyon.statusApproved'), body: t('rezervasyon.statusApprovedBody') };
      case 'confirmed':
        return { title: t('rezervasyon.statusConfirmed'), body: t('rezervasyon.statusConfirmedBody') };
      case 'rejected':
        return { title: t('rezervasyon.statusRejected'), body: t('rezervasyon.statusRejectedBody') };
      case 'expired':
        return { title: t('rezervasyon.statusExpired'), body: t('rezervasyon.statusExpiredBody') };
      default:
        return { title: t('rezervasyon.statusLabel'), body: t('rezervasyon.statusProcessing') };
    }
  }

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!user?.email || !reservationId) return null;
      if (!opts?.silent) setLoading(true);
      try {
        const data = await getMyTableReservation(reservationId, user.email);
        setRow(data);
        setError(null);
        return data;
      } catch (err) {
        setError(formatApiError(err, t('rezervasyon.detailLoadError')));
        return null;
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [reservationId, user?.email],
  );

  useEffect(() => {
    if (!user?.email) {
      Alert.alert(t('rezervasyon.loginTitle'), t('rezervasyon.loginBody'));
      return;
    }
    void load();
  }, [load, user?.email]);

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (!user?.email || !reservationId || row?.status !== 'pending_restaurant') return;
    pollRef.current = setInterval(() => {
      void load({ silent: true });
    }, POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load, reservationId, row?.status, user?.email]);

  async function onConfirm() {
    if (!user?.email || !reservationId) return;
    setBusy(true);
    try {
      const confirmed = await confirmTableReservation(reservationId, user.email);
      setRow(confirmed);
      Alert.alert(
        t('rezervasyon.confirmedAlertTitle'),
        `${confirmed.zone_label} · ${confirmed.table_label} · ${formatWhen(confirmed.reserved_at)}`,
        [{ text: t('rezervasyon.ok'), onPress: () => router.replace(`/restaurant/${confirmed.restaurant_id}`) }],
      );
    } catch (err) {
      Alert.alert(t('rezervasyon.errorTitle'), err instanceof Error ? err.message : t('rezervasyon.confirmFailed'));
      void load({ silent: true });
    } finally {
      setBusy(false);
    }
  }

  const status = row?.status ?? '';
  const copy = getStatusCopy(status);
  const canConfirm = status === 'approved_by_restaurant';
  const occasionKey = reservationOccasionI18nKey(row?.occasion_type);
  const occasionLabel = occasionKey ? t(occasionKey) : row?.occasion_label ?? null;

  return (
    <>
      <Stack.Screen
        options={{
          title: t('rezervasyon.title'),
          headerBackTitle: t('rezervasyon.back'),
          headerStyle: { backgroundColor: ReservationTheme.bg },
          headerTintColor: ReservationTheme.text,
          headerShadowVisible: false,
          ...(Platform.OS === 'ios' ? { headerBackTitleVisible: true } : {}),
        }}
      />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {loading && !row ? (
          <ActivityIndicator color={ReservationTheme.accent} style={{ marginTop: 40 }} />
        ) : error && !row ? (
          <View style={styles.block}>
            <Text style={styles.error}>{error}</Text>
            <Pressable style={styles.link} onPress={() => void load()}>
              <Text style={styles.linkText}>{t('rezervasyon.retry')}</Text>
            </Pressable>
          </View>
        ) : row ? (
          <View style={styles.block}>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.body}>{copy.body}</Text>

            <View style={styles.card}>
              <Text style={styles.cardLine}>{row.restaurant_name ?? t('rezervasyon.restaurantFallback')}</Text>
              <Text style={styles.cardMeta}>
                {row.zone_label} · {row.table_label} · {row.party_size}{t('rezervasyon.personSuffix')}
              </Text>
              <Text style={styles.cardMeta}>{formatWhen(row.reserved_at)}</Text>
              {row.customer_name ? (
                <Text style={styles.cardMeta}>{row.customer_name}</Text>
              ) : null}
              {occasionLabel ? (
                <Text style={styles.cardMeta}>
                  {t('rezervasyon.confirmOccasionLabel')}
                  {occasionLabel}
                </Text>
              ) : null}
              {row.note?.trim() ? (
                <Text style={styles.cardMeta}>
                  {t('rezervasyon.confirmNoteLabel')}
                  {row.note.trim()}
                </Text>
              ) : null}
            </View>

            {status === 'pending_restaurant' ? (
              <View style={styles.waitRow}>
                <ActivityIndicator color={ReservationTheme.accent} size="small" />
                <Text style={styles.waitText}>{t('rezervasyon.waitingResponse')}</Text>
              </View>
            ) : null}

            {row.reject_reason_text && status === 'rejected' ? (
              <Text style={styles.rejectReason}>{row.reject_reason_text}</Text>
            ) : null}

            {canConfirm ? (
              <Pressable
                style={[styles.btn, busy && styles.btnDisabled]}
                disabled={busy}
                onPress={() => void onConfirm()}>
                {busy ? (
                  <ActivityIndicator color={ReservationTheme.ctaText} />
                ) : (
                  <Text style={styles.btnText}>{t('rezervasyon.confirmBtn')}</Text>
                )}
              </Pressable>
            ) : null}

            {status === 'confirmed' ? (
              <Pressable
                style={styles.btn}
                onPress={() => router.replace(`/restaurant/${row.restaurant_id}`)}>
                <Text style={styles.btnText}>{t('rezervasyon.goToRestaurant')}</Text>
              </Pressable>
            ) : null}

            <Pressable style={styles.link} onPress={() => router.back()}>
              <Text style={styles.linkText}>{t('rezervasyon.back')}</Text>
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>
    </>
  );
}

function createStyles() {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: ReservationTheme.bg },
    block: { padding: 20, gap: 12 },
    title: { fontSize: 22, fontWeight: '800', color: ReservationTheme.text },
    body: { color: ReservationTheme.textMuted, lineHeight: 22, fontSize: 14 },
    card: {
      marginTop: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: ReservationTheme.border,
      backgroundColor: ReservationTheme.panel,
      padding: 14,
      gap: 4,
    },
    cardLine: { color: ReservationTheme.accent, fontWeight: '800', fontSize: 16 },
    cardMeta: { color: ReservationTheme.textMuted, fontSize: 14 },
    waitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
    waitText: { color: ReservationTheme.textSoft, fontSize: 13 },
    rejectReason: { color: '#fca5a5', fontSize: 13, lineHeight: 18 },
    btn: {
      marginTop: 8,
      backgroundColor: ReservationTheme.accent,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      minHeight: 48,
      justifyContent: 'center',
    },
    btnDisabled: { opacity: 0.7 },
    btnText: { color: ReservationTheme.ctaText, fontWeight: '800', fontSize: 16 },
    link: { marginTop: 8, alignItems: 'center' },
    linkText: { color: ReservationTheme.textSoft, fontWeight: '600' },
    error: { color: '#fca5a5', textAlign: 'center', lineHeight: 20 },
  });
}
