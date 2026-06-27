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

import { ReservationConfirmModal } from '@/components/reservation/ReservationConfirmModal';
import { ReservationDateTimeFields } from '@/components/reservation/ReservationDateTimeFields';
import {
  ReservationFloorPlanPicker,
  tableVisualState,
  type TableVisualState,
} from '@/components/ReservationFloorPlanPicker';
import { useSession } from '@/context/session-context';
import {
  createTableReservation,
  getRestaurant,
  getRestaurantReservationActive,
} from '@/lib/api';
import {
  defaultReservationSlot,
  formatSlotDateTimeTr,
  slotToIso,
  type ReservationSlot,
} from '@/lib/reservation-datetime';
import { formatTableCodeLong } from '@/lib/reservation-table-code';
import type { FloorPlanTable, Restaurant } from '@/lib/types';

function stateHint(state: TableVisualState, table: FloorPlanTable): string | null {
  if (state === 'reserved') return 'Bu masa secilen saatte dolu.';
  if (state === 'closed') return 'Restoran bu masayi rezervasyona kapatmis.';
  if (state === 'mismatch') {
    return `Bu masa ${table.seats_min}–${table.seats_max} kisi icin uygun. Kisi sayisini guncelleyin veya baska masa secin.`;
  }
  return null;
}

export default function OnlineReservationBookScreen() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const router = useRouter();
  const { user } = useSession();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [partySize, setPartySize] = useState('2');
  const [slot, setSlot] = useState<ReservationSlot>(defaultReservationSlot);
  const [note, setNote] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [selectedTable, setSelectedTable] = useState<FloorPlanTable | null>(null);
  const [tableHint, setTableHint] = useState<string | null>(null);
  const [active, setActive] = useState<Awaited<ReturnType<typeof getRestaurantReservationActive>> | null>(
    null,
  );

  const reservedIso = useMemo(() => slotToIso(slot), [slot]);
  const maxOnlineParty = active?.max_online_party_size ?? 10;
  const party = Math.max(1, Number(partySize) || 1);
  const partyTooLarge = party > maxOnlineParty;
  const contactPhone = active?.contact_phone?.trim() || null;
  const reservedIds = active?.reserved_table_ids ?? [];
  const closedIds = active?.closed_table_ids ?? [];

  const selectedState = useMemo(() => {
    if (!selectedTable) return null;
    return tableVisualState(
      selectedTable,
      party,
      new Set(reservedIds),
      new Set(closedIds),
      selectedTable.id,
    );
  }, [closedIds, party, reservedIds, selectedTable]);

  const nameValid = name.trim().split(/\s+/).filter(Boolean).length >= 2;
  const canOpenConfirm =
    Boolean(selectedTable) &&
    Boolean(reservedIso) &&
    Boolean(phone.trim()) &&
    nameValid &&
    Boolean(user?.email) &&
    !partyTooLarge &&
    selectedState !== 'reserved' &&
    selectedState !== 'closed' &&
    selectedState !== 'mismatch';

  const refreshPlan = useCallback(async () => {
    if (!restaurantId || !reservedIso) return;
    const payload = await getRestaurantReservationActive(restaurantId, {
      userEmail: user?.email,
      reservedAt: reservedIso,
    });
    setActive(payload);
    if (selectedTable) {
      const unavailable = [
        ...(payload.reserved_table_ids ?? []),
        ...(payload.closed_table_ids ?? []),
      ];
      if (unavailable.includes(selectedTable.id)) {
        setSelectedTable(null);
        setTableHint('Secilen masa artik uygun degil.');
      }
    }
  }, [restaurantId, reservedIso, user?.email, selectedTable]);

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    Promise.all([getRestaurant(restaurantId), getRestaurantReservationActive(restaurantId)])
      .then(([r, a]) => {
        setRestaurant(r);
        setActive(a);
      })
      .catch((err) => {
        Alert.alert('Hata', err instanceof Error ? err.message : 'Yuklenemedi');
        router.back();
      })
      .finally(() => setLoading(false));
  }, [restaurantId, router]);

  useEffect(() => {
    if (user?.fullName?.trim() && !name.trim()) {
      setName(user.fullName.trim());
    }
  }, [name, user?.fullName]);

  useEffect(() => {
    if (!reservedIso) return;
    void refreshPlan().catch(() => undefined);
  }, [refreshPlan, reservedIso]);

  function handleTablePress(table: FloorPlanTable, state: TableVisualState) {
    const hint = stateHint(state, table);
    setTableHint(hint);
    if (state === 'reserved' || state === 'closed') {
      setSelectedTable(null);
    }
  }

  function openConfirm() {
    if (!canOpenConfirm || !selectedTable) {
      if (!nameValid) {
        Alert.alert('Ad soyad', 'Lutfen ad ve soyadinizi girin.');
        return;
      }
      if (!phone.trim()) {
        Alert.alert('Telefon', 'Iletisim numarasi zorunlu.');
        return;
      }
      Alert.alert('Eksik bilgi', 'Masa, tarih, ad soyad ve telefon zorunlu.');
      return;
    }
    if (partyTooLarge) {
      Alert.alert(
        'Kisi sayisi yuksek',
        `Uygulama uzerinden en fazla ${maxOnlineParty} kisi icin rezervasyon yapilabilir.${contactPhone ? `\n\nTelefon: ${contactPhone}` : ''}`,
      );
      return;
    }
    setConfirmVisible(true);
  }

  async function onSubmitConfirmed() {
    if (!user?.email || !restaurantId || !selectedTable || !reservedIso) return;
    setSubmitting(true);
    try {
      const row = await createTableReservation(restaurantId, {
        user_email: user.email,
        table_id: selectedTable.id,
        party_size: party,
        reserved_at: reservedIso,
        note: note.trim() || null,
        customer_phone: phone.trim(),
        customer_name: name.trim(),
      });
      setConfirmVisible(false);
      Alert.alert(
        'Talep gonderildi',
        'Restoran paneline dusuruldu. Onayladiginda bildirim alacaksiniz; 24 saat icinde kesinlestirmeniz gerekir.',
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{restaurant?.name ?? 'Rezervasyon'}</Text>
        <Text style={styles.sub}>Masa kodu (S-M12) restoranla ayni · sec · onayla · gonder</Text>

        <ReservationDateTimeFields value={slot} onChange={setSlot} />

        <Text style={styles.label}>Kisi sayisi</Text>
        <TextInput
          value={partySize}
          onChangeText={setPartySize}
          keyboardType="number-pad"
          style={styles.input}
        />
        {partyTooLarge ? (
          <Text style={styles.warn}>
            {maxOnlineParty} kisiden fazla gruplar icin lutfen restoranla dogrudan gorunun
            {contactPhone ? ` (${contactPhone})` : ''}.
          </Text>
        ) : null}

        <ReservationFloorPlanPicker
          layout={active.floor_plan.layout}
          reservedTableIds={reservedIds}
          closedTableIds={closedIds}
          selectedTableId={selectedTable?.id ?? null}
          partySize={party}
          onSelect={(table) => {
            setSelectedTable(table);
            if (table) setTableHint(null);
          }}
          onTablePress={handleTablePress}
        />

        {tableHint ? <Text style={styles.warn}>{tableHint}</Text> : null}

        {selectedTable ? (
          <View style={styles.selectionCard}>
            <Text style={styles.selectionTitle}>{formatTableCodeLong(selectedTable.zone, selectedTable.label)}</Text>
            <Text style={styles.selectionMeta}>
              {selectedTable.seats_min}–{selectedTable.seats_max} kisi · {formatSlotDateTimeTr(slot)}
            </Text>

            <Text style={styles.label}>Ad soyad *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ad Soyad"
              placeholderTextColor="#64748b"
              autoCapitalize="words"
              style={styles.input}
            />
            {!nameValid && name.trim().length > 0 ? (
              <Text style={styles.warn}>Ad ve soyad birlikte zorunlu.</Text>
            ) : null}

            <Text style={styles.label}>Telefon *</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="05xx xxx xx xx"
              placeholderTextColor="#64748b"
              style={styles.input}
            />

            <Text style={styles.label}>Not (istege bagli)</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              multiline
              placeholder="Ozel istek, cocuk sandalyesi..."
              placeholderTextColor="#64748b"
              style={[styles.input, { minHeight: 72 }]}
            />

            <Pressable
              style={[styles.btn, !canOpenConfirm && styles.btnDisabled]}
              disabled={!canOpenConfirm}
              onPress={openConfirm}>
              <Text style={styles.btnText}>Rezervasyon yap</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.helper}>Haritadan masa kodunu secin (ornek S-M5, B-M2).</Text>
        )}
      </ScrollView>

      {selectedTable ? (
        <ReservationConfirmModal
          visible={confirmVisible}
          restaurantName={restaurant?.name ?? 'Restoran'}
          table={selectedTable}
          slot={slot}
          partySize={party}
          customerName={name.trim()}
          customerPhone={phone.trim()}
          note={note}
          submitting={submitting}
          onCancel={() => setConfirmVisible(false)}
          onConfirm={() => void onSubmitConfirmed()}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 16, gap: 10, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
  sub: { color: 'rgba(255,255,255,0.6)', marginBottom: 4, lineHeight: 18 },
  muted: { color: 'rgba(255,255,255,0.6)', marginTop: 12 },
  label: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4 },
  helper: { color: 'rgba(255,255,255,0.45)', fontSize: 12, lineHeight: 17 },
  warn: { color: '#fbbf24', fontSize: 13, marginTop: 4, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(15,23,42,0.8)',
  },
  selectionCard: {
    marginTop: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
    backgroundColor: 'rgba(251,191,36,0.08)',
    padding: 14,
    gap: 4,
  },
  selectionTitle: { color: '#fbbf24', fontSize: 17, fontWeight: '700' },
  selectionMeta: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginBottom: 6 },
  btn: {
    marginTop: 12,
    backgroundColor: '#fbbf24',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: '#0f172a', fontWeight: '700', fontSize: 16 },
});
