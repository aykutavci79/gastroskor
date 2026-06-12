import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { GastroColors } from '@/constants/theme';

export type KesfetChipId = 'en-iyi' | 'sokak' | 'tescilli' | 'online';

const CHIPS: { id: KesfetChipId; label: string }[] = [
  { id: 'en-iyi', label: 'En iyisi' },
  { id: 'sokak', label: 'Sokak' },
  { id: 'tescilli', label: 'Tescilli' },
  { id: 'online', label: 'Online sipariş' },
];

type Props = {
  active?: KesfetChipId;
  onChange?: (id: KesfetChipId) => void;
};

export function KesfetFilterChips({ active = 'en-iyi', onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.wrap}>
      {CHIPS.map((chip) => {
        const on = chip.id === active;
        return (
          <Pressable
            key={chip.id}
            style={[styles.chip, on && styles.chipOn]}
            onPress={() => onChange?.(chip.id)}>
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{chip.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 0, flexShrink: 0 },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    gap: 4,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipOn: {
    borderColor: GastroColors.accent,
    backgroundColor: GastroColors.accent,
  },
  chipText: {
    color: GastroColors.muted,
    fontSize: 9,
    fontWeight: '600',
  },
  chipTextOn: {
    color: '#fff',
    fontWeight: '800',
  },
});
