import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ReservationTheme } from '@/constants/reservation-theme';
import {
  reservationOccasionLabel,
  RESERVATION_OCCASION_OPTIONS,
  type ReservationOccasionType,
} from '@/lib/reservation-occasion';

type Props = {
  value: ReservationOccasionType | null;
  onChange: (value: ReservationOccasionType | null) => void;
};

export function ReservationOccasionPicker({ value, onChange }: Props) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const selectedLabel = useMemo(() => reservationOccasionLabel(value), [value]);

  function select(next: ReservationOccasionType | null) {
    onChange(next);
    setSheetVisible(false);
  }

  return (
    <>
      <Text style={styles.label}>Özel gün (isteğe bağlı)</Text>
      <Pressable style={styles.row} onPress={() => setSheetVisible(true)}>
        <Text style={[styles.rowText, !selectedLabel && styles.rowPlaceholder]}>
          {selectedLabel ?? 'Seçin'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={ReservationTheme.textSoft} />
      </Pressable>

      <Modal visible={sheetVisible} transparent animationType="slide" onRequestClose={() => setSheetVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSheetVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Özel gün</Text>
              <Pressable onPress={() => setSheetVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={ReservationTheme.textMuted} />
              </Pressable>
            </View>
            <Text style={styles.sheetHint}>Tek seçim — restoran hazırlık yapabilsin.</Text>
            <ScrollView contentContainerStyle={styles.chipsWrap}>
              <Pressable
                style={[styles.chip, value === null && styles.chipActive]}
                onPress={() => select(null)}>
                <Text style={[styles.chipText, value === null && styles.chipTextActive]}>Yok</Text>
              </Pressable>
              {RESERVATION_OCCASION_OPTIONS.map((option) => {
                const active = value === option.type;
                return (
                  <Pressable
                    key={option.type}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => select(option.type)}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  label: { color: ReservationTheme.textMuted, fontSize: 13, marginTop: 2 },
  row: {
    borderWidth: 1,
    borderColor: ReservationTheme.borderSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ReservationTheme.bg,
  },
  rowText: { color: ReservationTheme.text, fontSize: 15, fontWeight: '600' },
  rowPlaceholder: { color: ReservationTheme.textSoft, fontWeight: '500' },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    maxHeight: '72%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: ReservationTheme.bgElevated,
    borderWidth: 1,
    borderColor: ReservationTheme.border,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: { color: ReservationTheme.text, fontSize: 18, fontWeight: '800' },
  sheetHint: { color: ReservationTheme.textSoft, fontSize: 12, marginTop: 6, marginBottom: 12 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ReservationTheme.borderSoft,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: ReservationTheme.panel,
  },
  chipActive: {
    borderColor: ReservationTheme.accent,
    backgroundColor: ReservationTheme.accentGlow,
  },
  chipText: { color: ReservationTheme.textMuted, fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: ReservationTheme.accent, fontWeight: '800' },
});
