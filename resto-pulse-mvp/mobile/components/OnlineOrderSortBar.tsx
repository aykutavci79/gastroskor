import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GastroColors } from '@/constants/theme';
import {
  ONLINE_ORDER_SORT_OPTIONS,
  type OnlineOrderSortMode,
} from '@/lib/online-order-sort';

type Props = {
  value: OnlineOrderSortMode;
  onChange: (mode: OnlineOrderSortMode) => void;
};

export function OnlineOrderSortBar({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Sırala</Text>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {ONLINE_ORDER_SORT_OPTIONS.map((opt) => {
          const on = value === opt.id;
          return (
            <Pressable
              key={opt.id}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => onChange(opt.id)}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { color: GastroColors.muted, fontSize: 12, fontWeight: '700' },
  row: { gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: GastroColors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: GastroColors.panel,
  },
  chipOn: {
    borderColor: GastroColors.accent,
    backgroundColor: GastroColors.accentSoft,
  },
  chipText: { color: GastroColors.muted, fontSize: 13, fontWeight: '700' },
  chipTextOn: { color: GastroColors.accent, fontWeight: '800' },
});
