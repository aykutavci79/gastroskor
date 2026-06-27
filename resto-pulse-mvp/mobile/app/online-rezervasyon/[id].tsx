import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { confirmTableReservation } from '@/lib/api';
import type { TableReservationRead } from '@/lib/types';

export default function OnlineReservationConfirmScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.email) {
      Alert.alert('Giris', 'Rezervasyonu onaylamak icin giris yapin.');
    }
  }, [user?.email]);

  async function onConfirm() {
    if (!user?.email || !id) return;
    setBusy(true);
    try {
      const row: TableReservationRead = await confirmTableReservation(id, user.email);
      Alert.alert(
        'Rezervasyon kesinlesti',
        `${row.zone_label} · ${row.table_label} · ${new Date(row.reserved_at).toLocaleString('tr-TR')}`,
        [{ text: 'Tamam', onPress: () => router.replace(`/restaurant/${row.restaurant_id}`) }],
      );
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Onaylanamadi');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Rezervasyon onayi</Text>
      <Text style={styles.body}>
        Restoran talebinizi onayladi. 24 saat icinde asagidan kesinlestirin; aksi halde masa serbest kalir.
      </Text>
      {busy ? <ActivityIndicator color="#fbbf24" /> : null}
      <Pressable style={styles.btn} disabled={busy || !user?.email} onPress={() => void onConfirm()}>
        <Text style={styles.btnText}>Rezervasyonu kesinlestir</Text>
      </Pressable>
      <Pressable style={styles.link} onPress={() => router.back()}>
        <Text style={styles.linkText}>Vazgec</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
  body: { color: 'rgba(255,255,255,0.7)', marginTop: 12, lineHeight: 22 },
  btn: {
    marginTop: 24,
    backgroundColor: '#22c55e',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { color: '#052e16', fontWeight: '700', fontSize: 16 },
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { color: 'rgba(255,255,255,0.55)' },
});
