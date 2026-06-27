import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { ExpoGoDevSignInCard } from '@/components/ExpoGoDevSignInCard';
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
import { readStoredOrderPhone } from '@/lib/order-contact-secure-storage';
import { normalizeTrMobileInput } from '@/lib/phone-tr';
import type { FloorPlanTable, Restaurant } from '@/lib/types';

function isCustomerNameValid(name: string): boolean {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length >= 2 && parts.every((part) => part.length >= 2);
}

function isPhoneValid(phone: string): boolean {
  return normalizeTrMobileInput(phone) !== null;
}

function tableAllowsReservation(
  table: FloorPlanTable,
  partySize: number,
  reservedIds: string[],
  closedIds: string[],
): boolean {
  if (closedIds.includes(table.id) || table.reservation_closed) return false;
  if (reservedIds.includes(table.id)) return false;
  return partySize >= table.seats_min && partySize <= table.seats_max;
}

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
  const scrollRef = useRef<ScrollView>(null);
  const formOffsetY = useRef(0);

  const reservedIso = useMemo(() => slotToIso(slot), [slot]);
  const maxOnlineParty = active?.max_online_party_size ?? 10;
  const party = Math.max(1, Number(partySize) || 1);
  const partyTooLarge = party > maxOnlineParty;
  const contactPhone = active?.contact_phone?.trim() || null;
  const reservedIds = active?.reserved_table_ids ?? [];
  const closedIds = active?.closed_table_ids ?? [];

  const nameValid = isCustomerNameValid(name);
  const phoneValid = isPhoneValid(phone);

  const submitBlockers = useMemo(() => {
    const items: string[] = [];
    if (!user?.email) items.push('Giris yapin');
    if (!selectedTable) items.push('Masa secin');
    if (selectedTable && !tableAllowsReservation(selectedTable, party, reservedIds, closedIds)) {
      items.push(`Kisi sayisi (${selectedTable.seats_min}–${selectedTable.seats_max})`);
    }
    if (!nameValid) items.push('Ad ve soyad');
    if (!phoneValid) items.push('Gecerli telefon (05xx...)');
    if (partyTooLarge) items.push(`En fazla ${maxOnlineParty} kisi`);
    return items;
  }, [
    closedIds,
    maxOnlineParty,
    nameValid,
    party,
    partyTooLarge,
    phoneValid,
    reservedIds,
    selectedTable,
    user?.email,
  ]);

  const canOpenConfirm = submitBlockers.length === 0;

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
    void readStoredOrderPhone()
      .then((stored) => {
        if (stored?.trim()) {
          setPhone((current) => current.trim() || stored.trim());
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!reservedIso) return;
    void refreshPlan().catch(() => undefined);
  }, [refreshPlan, reservedIso]);

  function handleSelectTable(table: FloorPlanTable | null) {
    setSelectedTable(table);
    if (table) {
      setTableHint(null);
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          y: Math.max(0, formOffsetY.current - 12),
          animated: true,
        });
      }, 80);
    }
  }

  function handleTablePress(table: FloorPlanTable, state: TableVisualState) {
    const hint = stateHint(state, table);
    setTableHint(hint);
    if (state === 'reserved' || state === 'closed') {
      setSelectedTable(null);
    }
  }

  function openConfirm() {
    if (!selectedTable) {
      Alert.alert('Masa secin', 'Haritadan bir masa kodu secin.');
      return;
    }
    if (!user?.email) {
      Alert.alert(
        'Giris gerekli',
        'Rezervasyon icin once gelistirici girisi yapin (Expo Go) veya Profil sekmesinden oturum acin.',
      );
      return;
    }
    if (!canOpenConfirm) {
      Alert.alert('Eksik bilgi', submitBlockers.join('\n'));
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
        customer_phone: normalizeTrMobileInput(phone.trim()) ?? phone.trim(),
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
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{restaurant?.name ?? 'Rezervasyon'}</Text>
        <Text style={styles.sub}>Masa sec · bilgileri doldur · onayla</Text>

        {!user?.email ? <ExpoGoDevSignInCard /> : null}

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
          onSelect={handleSelectTable}
          onTablePress={handleTablePress}
        />

        {tableHint ? <Text style={styles.warn}>{tableHint}</Text> : null}

        <View
          style={styles.selectionCard}
          onLayout={(event) => {
            formOffsetY.current = event.nativeEvent.layout.y;
          }}>
          <Text style={styles.formSectionTitle}>Rezervasyon bilgileri</Text>

          {selectedTable ? (
            <>
              <Text style={styles.selectionTitle}>{formatTableCodeLong(selectedTable.zone, selectedTable.label)}</Text>
              <Text style={styles.selectionMeta}>
                {selectedTable.seats_min}–{selectedTable.seats_max} kisi
              </Text>
            </>
          ) : (
            <Text style={styles.warn}>Once yukaridan bir masa kodu secin (ornek S-M5).</Text>
          )}

          <ReservationDateTimeFields value={slot} onChange={setSlot} />

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
            <Text style={styles.warn}>Ornek: Ahmet Yilmaz (ad ve soyad ayri)</Text>
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
          {!phoneValid && phone.trim().length > 0 ? (
            <Text style={styles.warn}>10 haneli cep numarasi girin (5 ile baslamali).</Text>
          ) : null}

          <Text style={styles.label}>Not (istege bagli)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="Ozel istek, cocuk sandalyesi..."
            placeholderTextColor="#64748b"
            style={[styles.input, { minHeight: 72 }]}
          />

          {submitBlockers.length > 0 ? (
            <Text style={styles.helper}>Eksik: {submitBlockers.join(' · ')}</Text>
          ) : (
            <Text style={styles.helperReady}>Hazir — rezervasyonu onaylayabilirsiniz.</Text>
          )}

          <Pressable style={[styles.btn, !canOpenConfirm && styles.btnMuted]} onPress={openConfirm}>
            <Text style={styles.btnText}>Rezervasyon yap</Text>
          </Pressable>
        </View>
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
  btnMuted: { opacity: 0.72 },
  btnText: { color: '#0f172a', fontWeight: '700', fontSize: 16 },
  helperReady: { color: '#4ade80', fontSize: 12, marginTop: 6 },
});
