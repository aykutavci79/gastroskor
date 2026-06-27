import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReservationFloorPlanPicker } from '@/components/ReservationFloorPlanPicker';
import { useAuth } from '@/contexts/AuthContext';
import {
  createTableReservation,
  getRestaurant,
  getRestaurantReservationActive,
} from '@/lib/api';
import type { FloorPlanTable, Restaurant } from '@/lib/types';

function defaultReservedAt(): string {
  const d = new Date();
  d.setHours(d.getHours() + 2, 0, 0, 0);
  return d.toISOString();
}

function parseLocalDatetime(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const iso = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function OnlineReservationBookScreen() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [partySize, setPartySize] = useState('2');
  const [reservedAtInput, setReservedAtInput] = useState('');
  const [note, setNote] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [selectedTable, setSelectedTable] = useState<FloorPlanTable | null>(null);
  const [active, setActive] = useState<Awaited<ReturnType<typeof getRestaurantReservationActive>> | null>(
    null,
  );

  const reservedIso = useMemo(() => parseLocalDatetime(reservedAtInput), [reservedAtInput]);
  const party = Math.max(1, Math.min(30, Number(partySize) || 1));

  const refreshPlan = useCallback(async () => {
    if (!restaurantId || !reservedIso) return;
    const payload = await getRestaurantReservationActive(restaurantId, {
      userEmail: user?.email,
      reservedAt: reservedIso,
    });
    setActive(payload);
    if (selectedTable && payload.reserved_table_ids.includes(selectedTable.id)) {
      setSelectedTable(null);
    }
  }, [restaurantId, reservedIso, user?.email, selectedTable]);

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    Promise.all([getRestaurant(restaurantId), getRestaurantReservationActive(restaurantId)])
      .then(([r, a]) => {
        setRestaurant(r);
        setActive(a);
        setReservedAtInput(defaultReservedAt().slice(0, 16));
      })
      .catch((err) => {
        Alert.alert('Hata', err instanceof Error ? err.message : 'Yuklenemedi');
        router.back();
      })
      .finally(() => setLoading(false));
  }, [restaurantId, router]);

  useEffect(() => {
    if (!reservedIso) return;
    void refreshPlan().catch(() => undefined);
  }, [refreshPlan, reservedIso]);

  async function onSubmit() {
    if (!user?.email || !restaurantId || !selectedTable || !reservedIso) {
      Alert.alert('Eksik bilgi', 'Masa, tarih ve telefon zorunlu.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Telefon', 'Iletisim numarasi girin.');
      return;
    }
    setSubmitting(true);
    try {
      const row = await createTableReservation(restaurantId, {
        user_email: user.email,
        table_id: selectedTable.id,
        party_size: party,
        reserved_at: reservedIso,
        note: note.trim() || null,
        customer_phone: phone.trim(),
        customer_name: name.trim() || null,
      });
      Alert.alert(
        'Talep gonderildi',
        'Restoran onayladiginda bildirim alacaksiniz; 24 saat icinde kesinlestirmeniz gerekir.',
        [{ text: 'Tamam', onPress: () => router.replace(`/online-rezervasyon/${row.id}`) }],
      );
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Rezervasyon gonderilemedi');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color="#fbbf24" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!active?.online_reservations_available || !active.floor_plan?.layout) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>Online rezervasyon</Text>
        <Text style={styles.muted}>Bu restoran su an online rezervasyon almiyor.</Text>
        <Pressable style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>Geri</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{restaurant?.name ?? 'Rezervasyon'}</Text>
        <Text style={styles.sub}>Salondan masa secin · cift onay</Text>

        <Text style={styles.label}>Tarih / saat (YYYY-MM-DDTHH:mm)</Text>
        <TextInput
          value={reservedAtInput}
          onChangeText={setReservedAtInput}
          placeholder="2026-06-25T19:00"
          placeholderTextColor="#64748b"
          style={styles.input}
        />

        <Text style={styles.label}>Kisi sayisi</Text>
        <TextInput
          value={partySize}
          onChangeText={setPartySize}
          keyboardType="number-pad"
          style={styles.input}
        />

        <ReservationFloorPlanPicker
          layout={active.floor_plan.layout}
          reservedTableIds={active.reserved_table_ids}
          selectedTableId={selectedTable?.id ?? null}
          partySize={party}
          onSelect={setSelectedTable}
        />

        <Text style={styles.label}>Telefon</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={styles.input}
        />

        <Text style={styles.label}>Ad (istege bagli)</Text>
        <TextInput value={name} onChangeText={setName} style={styles.input} />

        <Text style={styles.label}>Not (istege bagli)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          style={[styles.input, { minHeight: 72 }]}
        />

        <Pressable
          style={[styles.btn, submitting && styles.btnDisabled]}
          disabled={submitting}
          onPress={() => void onSubmit()}>
          <Text style={styles.btnText}>{submitting ? 'Gonderiliyor...' : 'Rezervasyon talebi gonder'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 16, gap: 8, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
  sub: { color: 'rgba(255,255,255,0.6)', marginBottom: 8 },
  muted: { color: 'rgba(255,255,255,0.6)', marginTop: 12 },
  label: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(15,23,42,0.8)',
  },
  btn: {
    marginTop: 16,
    backgroundColor: '#fbbf24',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#0f172a', fontWeight: '700', fontSize: 16 },
});
