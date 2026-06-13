import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { ONLINE_ORDER_CATEGORIES } from '@/constants/online-order-categories';
import { GastroColors } from '@/constants/theme';
import { kitchenShortLabel } from '@/lib/kitchen-category-visual';

type Props = {
  activeSlug?: string | null;
  onSelect: (slug: string) => void;
};

export function KesfetKitchenChips({ activeSlug = null, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.wrap}
      keyboardShouldPersistTaps="handled">
      {ONLINE_ORDER_CATEGORIES.map((cat) => {
        const on = cat.slug === activeSlug;
        return (
          <Pressable
            key={cat.slug}
            style={[styles.chip, on && styles.chipOn]}
            onPress={() => onSelect(cat.slug)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}>
            <Text style={[styles.chipText, on && styles.chipTextOn]}>
              {kitchenShortLabel(cat.label, 14)}
            </Text>
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
