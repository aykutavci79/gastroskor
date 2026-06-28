import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/context/session-context';
import { confirmTableReservation, getMyTableReservation } from '@/lib/api';
import { formatApiError } from '@/lib/format-api-error';
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

function statusCopy(status: string): { title: string; body: string } {
  switch (status) {
    case 'pending_restaurant':
      return {
        title: 'Restoran onayini bekliyor',
        body: 'Talebiniz restoran paneline iletildi. Onaylandiginda bildirim alacaksiniz; ardindan 24 saat icinde kesinlestirmeniz gerekir.',
      };
    case 'approved_by_restaurant':
      return {
        title: 'Restoran onayladi',
        body: 'Masaniz ayrildi. 24 saat icinde asagidan kesinlestirin; aksi halde masa serbest kalir.',
      };
    case 'confirmed':
      return {
        title: 'Rezervasyon kesinlesti',
        body: 'Gorusmek uzere — restorana gidebilirsiniz.',
      };
    case 'rejected':
      return {
        title: 'Rezervasyon reddedildi',
        body: 'Restoran su an bu talebi kabul edemedi.',
      };
    case 'expired':
      return {
        title: 'Onay suresi doldu',
        body: 'Kesinlestirme suresi gectigi icin masa serbest birakildi.',
      };
    default:
      return {
        title: 'Rezervasyon durumu',
        body: 'Talep isleniyor.',
      };
  }
}

export default function OnlineReservationStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reservationId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { user } = useSession();
  const [row, setRow] = useState<TableReservationRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        setError(formatApiError(err, 'Rezervasyon yuklenemedi.'));
        return null;
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [reservationId, user?.email],
  );

  useEffect(() => {
    if (!user?.email) {
      Alert.alert('Giris', 'Rezervasyonu gormek icin giris yapin.');
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
        'Rezervasyon kesinlesti',
        `${confirmed.zone_label} · ${confirmed.table_label} · ${formatWhen(confirmed.reserved_at)}`,
        [{ text: 'Tamam', onPress: () => router.replace(`/restaurant/${confirmed.restaurant_id}`) }],
      );
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Onaylanamadi');
      void load({ silent: true });
    } finally {
      setBusy(false);
    }
  }

  const status = row?.status ?? '';
  const copy = statusCopy(status);
  const canConfirm = status === 'approved_by_restaurant';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Rezervasyon',
          headerBackTitle: 'Geri',
        }}
      />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {loading && !row ? (
          <ActivityIndicator color="#fbbf24" style={{ marginTop: 40 }} />
        ) : error && !row ? (
          <View style={styles.block}>
            <Text style={styles.error}>{error}</Text>
            <Pressable style={styles.link} onPress={() => void load()}>
              <Text style={styles.linkText}>Tekrar dene</Text>
            </Pressable>
          </View>
        ) : row ? (
          <View style={styles.block}>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.body}>{copy.body}</Text>

            <View style={styles.card}>
              <Text style={styles.cardLine}>{row.restaurant_name ?? 'Restoran'}</Text>
              <Text style={styles.cardMeta}>
                {row.zone_label} · {row.table_label} · {row.party_size} kisi
              </Text>
              <Text style={styles.cardMeta}>{formatWhen(row.reserved_at)}</Text>
              {row.customer_name ? (
                <Text style={styles.cardMeta}>{row.customer_name}</Text>
              ) : null}
            </View>

            {status === 'pending_restaurant' ? (
              <View style={styles.waitRow}>
                <ActivityIndicator color="#fbbf24" size="small" />
                <Text style={styles.waitText}>Restoran yaniti bekleniyor…</Text>
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
                  <ActivityIndicator color="#052e16" />
                ) : (
                  <Text style={styles.btnText}>Rezervasyonu kesinlestir</Text>
                )}
              </Pressable>
            ) : null}

            {status === 'confirmed' ? (
              <Pressable
                style={styles.btn}
                onPress={() => router.replace(`/restaurant/${row.restaurant_id}`)}>
                <Text style={styles.btnText}>Restorana git</Text>
              </Pressable>
            ) : null}

            <Pressable style={styles.link} onPress={() => router.back()}>
              <Text style={styles.linkText}>Geri</Text>
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  block: { padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
  body: { color: 'rgba(255,255,255,0.7)', lineHeight: 22 },
  card: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
    backgroundColor: 'rgba(251,191,36,0.08)',
    padding: 14,
    gap: 4,
  },
  cardLine: { color: '#fbbf24', fontWeight: '700', fontSize: 16 },
  cardMeta: { color: 'rgba(255,255,255,0.75)', fontSize: 14 },
  waitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  waitText: { color: 'rgba(255,255,255,0.55)', fontSize: 13 },
  rejectReason: { color: '#fca5a5', fontSize: 13, lineHeight: 18 },
  btn: {
    marginTop: 8,
    backgroundColor: '#22c55e',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#052e16', fontWeight: '700', fontSize: 16 },
  link: { marginTop: 8, alignItems: 'center' },
  linkText: { color: 'rgba(255,255,255,0.55)' },
  error: { color: '#fca5a5', textAlign: 'center', lineHeight: 20 },
});
