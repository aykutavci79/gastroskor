import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatSlotDateTimeTr, type ReservationSlot } from '@/lib/reservation-datetime';
import { formatTableCodeLong } from '@/lib/reservation-table-code';
import type { FloorPlanTable } from '@/lib/types';

type Props = {
  visible: boolean;
  restaurantName: string;
  table: FloorPlanTable;
  slot: ReservationSlot;
  partySize: number;
  customerName: string;
  customerPhone: string;
  note: string;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ReservationConfirmModal({
  visible,
  restaurantName,
  table,
  slot,
  partySize,
  customerName,
  customerPhone,
  note,
  submitting,
  onCancel,
  onConfirm,
}: Props) {
  const tableCode = formatTableCodeLong(table.zone, table.label);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Rezervasyonu onayliyor musunuz?</Text>
          <Text style={styles.restaurant}>{restaurantName}</Text>

          <View style={styles.block}>
            <Text style={styles.line}>
              <Text style={styles.key}>Tarih / saat: </Text>
              {formatSlotDateTimeTr(slot)}
            </Text>
            <Text style={styles.line}>
              <Text style={styles.key}>Masa: </Text>
              {tableCode}
            </Text>
            <Text style={styles.line}>
              <Text style={styles.key}>Kisi: </Text>
              {partySize}
            </Text>
            <Text style={styles.line}>
              <Text style={styles.key}>Ad soyad: </Text>
              {customerName}
            </Text>
            <Text style={styles.line}>
              <Text style={styles.key}>Telefon: </Text>
              {customerPhone}
            </Text>
            {note.trim() ? (
              <Text style={styles.line}>
                <Text style={styles.key}>Not: </Text>
                {note.trim()}
              </Text>
            ) : null}
          </View>

          <Text style={styles.hint}>Onayladiginizda talep restoran paneline dusur ve bildirim gider.</Text>

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} disabled={submitting} onPress={onCancel}>
              <Text style={styles.cancelText}>Vazgec</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmBtn, submitting && styles.confirmDisabled]}
              disabled={submitting}
              onPress={onConfirm}>
              <Text style={styles.confirmText}>{submitting ? 'Gonderiliyor...' : 'Onayla ve gonder'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 18,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
    padding: 18,
    gap: 10,
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  restaurant: { color: 'rgba(255,255,255,0.65)', fontSize: 14 },
  block: {
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 12,
    gap: 6,
  },
  line: { color: '#fff', fontSize: 14, lineHeight: 20 },
  key: { color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
  hint: { color: 'rgba(255,255,255,0.45)', fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelText: { color: '#fff', fontWeight: '700' },
  confirmBtn: {
    flex: 1.4,
    borderRadius: 12,
    backgroundColor: '#fbbf24',
    paddingVertical: 13,
    alignItems: 'center',
  },
  confirmDisabled: { opacity: 0.6 },
  confirmText: { color: '#0f172a', fontWeight: '800', fontSize: 15 },
});
