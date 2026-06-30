import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
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
import { ReservationOccasionPicker } from '@/components/reservation/ReservationOccasionPicker';
import { ReservationBookHeader } from '@/components/reservation/ReservationBookHeader';
import { ReservationBookSection } from '@/components/reservation/ReservationBookSection';
import { ReservationDateTimeFields } from '@/components/reservation/ReservationDateTimeFields';
import { ReservationPartySizeStepper } from '@/components/reservation/ReservationPartySizeStepper';
import { ExpoGoDevSignInCard } from '@/components/ExpoGoDevSignInCard';
import { ReservationTheme } from '@/constants/reservation-theme';
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
  slotToIso,
  type ReservationSlot,
} from '@/lib/reservation-datetime';
import { formatTableCodeLong } from '@/lib/reservation-table-code';
import type { ReservationOccasionType } from '@/lib/reservation-occasion';
import { readStoredOrderPhone } from '@/lib/order-contact-secure-storage';
import { normalizeTrMobileInput } from '@/lib/phone-tr';
import type { FloorPlanTable, Restaurant } from '@/lib/types';

const PLACEHOLDER = ReservationTheme.textSoft;

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
  if (state === 'reserved') return 'Bu masa seçilen saatte dolu.';
  if (state === 'closed') return 'Restoran bu masayı rezervasyona kapatmış.';
  if (state === 'mismatch') {
    return `Bu masa ${table.seats_min}–${table.seats_max} kişi için uygun. Kişi sayısını güncelleyin veya başka masa seçin.`;
  }
  return null;
}

export default function OnlineReservationBookScreen() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const router = useRouter();
  const { user } = useSession();
  const styles = useMemo(() => createStyles(), []);

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [partySize, setPartySize] = useState(2);
  const [slot, setSlot] = useState<ReservationSlot>(defaultReservationSlot);
  const [note, setNote] = useState('');
  const [occasionType, setOccasionType] = useState<ReservationOccasionType | null>(null);
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
  const party = Math.max(1, partySize);
  const partyTooLarge = party > maxOnlineParty;
  const contactPhone = active?.contact_phone?.trim() || null;
  const reservedIds = active?.reserved_table_ids ?? [];
  const closedIds = active?.closed_table_ids ?? [];

  const nameValid = isCustomerNameValid(name);
  const phoneValid = isPhoneValid(phone);

  const submitBlockers = useMemo(() => {
    const items: string[] = [];
    if (!user?.email) items.push('Giriş yapın');
    if (!selectedTable) items.push('Masa seçin');
    if (selectedTable && !tableAllowsReservation(selectedTable, party, reservedIds, closedIds)) {
      items.push(`Kişi sayısı (${selectedTable.seats_min}–${selectedTable.seats_max})`);
    }
    if (!nameValid) items.push('Ad ve soyad');
    if (!phoneValid) items.push('Geçerli telefon (05xx…)');
    if (partyTooLarge) items.push(`En fazla ${maxOnlineParty} kişi`);
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
        setTableHint('Seçilen masa artık uygun değil.');
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
        Alert.alert('Hata', err instanceof Error ? err.message : 'Yüklenemedi');
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
    setTableHint(stateHint(state, table));
    if (state === 'reserved' || state === 'closed') {
      setSelectedTable(null);
    }
  }

  function openConfirm() {
    if (!selectedTable) {
      Alert.alert('Masa seçin', 'Haritadan bir masa kodu seçin.');
      return;
    }
    if (!user?.email) {
      Alert.alert(
        'Giriş gerekli',
        'Rezervasyon için oturum açın (Profil sekmesi veya geliştirici girişi).',
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
        occasion_type: occasionType,
        customer_phone: normalizeTrMobileInput(phone.trim()) ?? phone.trim(),
        customer_name: name.trim(),
      });
      setConfirmVisible(false);
      Alert.alert(
        'Talep gönderildi',
        'Restoran onayını bekleyin. Onaydan sonra bildirim gelir; 24 saat içinde kesinleştirmeniz gerekir.',
        [{ text: 'Tamam', onPress: () => router.replace(`/online-rezervasyon/${row.id}`) }],
      );
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Rezervasyon gönderilemedi');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: 'Masa seç' }} />
        <ActivityIndicator color={ReservationTheme.accent} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!active?.online_reservations_available || !active.floor_plan?.layout) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: 'Masa seç' }} />
        <View style={styles.unavailable}>
          <Text style={styles.title}>Online rezervasyon</Text>
          <Text style={styles.muted}>Bu restoran şu an online rezervasyon almıyor.</Text>
          <Pressable style={styles.btn} onPress={() => router.back()}>
            <Text style={styles.btnText}>Geri</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Masa seç' }} />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">
        {restaurant ? (
          <ReservationBookHeader
            restaurant={restaurant}
            floorBackgroundUrl={active.floor_plan.background_url}
          />
        ) : null}

        {!user?.email ? <ExpoGoDevSignInCard /> : null}

        <ReservationBookSection
          step="1"
          title="Kişi sayısı"
          subtitle="Grubunuz kaç kişi? Masa kapasitesi buna göre renklendirilir.">
          <ReservationPartySizeStepper
            value={party}
            max={Math.max(maxOnlineParty, party)}
            onChange={setPartySize}
          />
          {partyTooLarge ? (
            <Text style={styles.warn}>
              {maxOnlineParty} kişiden fazla gruplar için lütfen restoranla doğrudan görüşün
              {contactPhone ? ` (${contactPhone})` : ''}.
            </Text>
          ) : null}
        </ReservationBookSection>

        <ReservationBookSection
          step="2"
          title="Tarih ve saat"
          subtitle="Seçtiğiniz saatte dolu masalar haritada gri görünür.">
          <ReservationDateTimeFields embedded value={slot} onChange={setSlot} />
        </ReservationBookSection>

        <ReservationBookSection
          step="3"
          title="Salon planı"
          subtitle="Altın: seçili · Yeşil: uygun · Gri: dolu">
          <View style={styles.floorWrap}>
            <ReservationFloorPlanPicker
              layout={active.floor_plan.layout}
              backgroundUrl={active.floor_plan.background_url}
              reservedTableIds={reservedIds}
              closedTableIds={closedIds}
              selectedTableId={selectedTable?.id ?? null}
              partySize={party}
              onSelect={handleSelectTable}
              onTablePress={handleTablePress}
            />
          </View>
          {tableHint ? <Text style={styles.warn}>{tableHint}</Text> : null}
          {!selectedTable ? (
            <Text style={styles.helper}>Haritadan bir masa kodu seçin (örnek S-M5).</Text>
          ) : (
            <View style={styles.tableChip}>
              <Text style={styles.tableChipLabel}>Seçilen masa</Text>
              <Text style={styles.tableChipValue}>
                {formatTableCodeLong(selectedTable.zone, selectedTable.label)} · {selectedTable.seats_min}–
                {selectedTable.seats_max} kişi
              </Text>
            </View>
          )}
        </ReservationBookSection>

        <View
          onLayout={(event) => {
            formOffsetY.current = event.nativeEvent.layout.y;
          }}>
          <ReservationBookSection
            step="4"
            title="İletişim bilgileri"
            subtitle="Talep restoran paneline düşer; onay sonrası çift onay ile kesinleşir.">
            <Text style={styles.label}>Ad soyad *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ad Soyad"
              placeholderTextColor={PLACEHOLDER}
              autoCapitalize="words"
              style={styles.input}
            />
            {!nameValid && name.trim().length > 0 ? (
              <Text style={styles.warn}>Örnek: Ahmet Yılmaz (ad ve soyad ayrı)</Text>
            ) : null}

            <Text style={styles.label}>Telefon *</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="05xx xxx xx xx"
              placeholderTextColor={PLACEHOLDER}
              style={styles.input}
            />
            {!phoneValid && phone.trim().length > 0 ? (
              <Text style={styles.warn}>10 haneli cep numarası girin (5 ile başlamalı).</Text>
            ) : null}

            <ReservationOccasionPicker value={occasionType} onChange={setOccasionType} />

            <Text style={[styles.label, { marginTop: 10 }]}>Ek not (isteğe bağlı)</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              multiline
              placeholder="Cam kenarı, çocuk sandalyesi, pasta…"
              placeholderTextColor={PLACEHOLDER}
              style={[styles.input, styles.inputMultiline]}
            />

            {submitBlockers.length > 0 ? (
              <Text style={styles.helper}>Eksik: {submitBlockers.join(' · ')}</Text>
            ) : (
              <Text style={styles.helperReady}>Hazır — rezervasyon talebini gönderebilirsiniz.</Text>
            )}

            <Pressable
              style={[styles.btn, !canOpenConfirm && styles.btnMuted]}
              disabled={!canOpenConfirm}
              onPress={openConfirm}>
              <Text style={styles.btnText}>Rezervasyon talebi gönder</Text>
            </Pressable>
          </ReservationBookSection>
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
          occasionType={occasionType}
          note={note}
          submitting={submitting}
          onCancel={() => setConfirmVisible(false)}
          onConfirm={() => void onSubmitConfirmed()}
        />
      ) : null}
    </SafeAreaView>
  );
}

function createStyles() {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: ReservationTheme.bg },
    scroll: { padding: 16, gap: 14, paddingBottom: 36 },
    unavailable: { padding: 20, gap: 12 },
    title: { fontSize: 22, fontWeight: '800', color: ReservationTheme.text },
    muted: { color: ReservationTheme.textMuted, lineHeight: 20 },
    label: { color: ReservationTheme.textMuted, fontSize: 13, marginTop: 2 },
    helper: { color: ReservationTheme.textSoft, fontSize: 12, lineHeight: 17 },
    warn: { color: ReservationTheme.warn, fontSize: 13, lineHeight: 18 },
    input: {
      borderWidth: 1,
      borderColor: ReservationTheme.borderSoft,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 11,
      color: ReservationTheme.text,
      backgroundColor: ReservationTheme.bg,
    },
    inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
    floorWrap: { marginHorizontal: -2 },
    tableChip: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: ReservationTheme.border,
      backgroundColor: ReservationTheme.accentGlow,
      padding: 12,
      gap: 4,
    },
    tableChipLabel: {
      color: ReservationTheme.textSoft,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    tableChipValue: {
      color: ReservationTheme.accent,
      fontSize: 16,
      fontWeight: '800',
    },
    btn: {
      marginTop: 4,
      backgroundColor: ReservationTheme.cta,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: 'center',
      minHeight: 48,
      justifyContent: 'center',
    },
    btnMuted: { opacity: 0.55 },
    btnText: { color: ReservationTheme.ctaText, fontWeight: '800', fontSize: 16 },
    helperReady: { color: ReservationTheme.success, fontSize: 12, lineHeight: 17 },
  });
}
