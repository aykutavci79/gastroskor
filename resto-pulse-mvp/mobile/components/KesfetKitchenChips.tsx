import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { ONLINE_ORDER_CATEGORIES } from '@/constants/online-order-categories';
import type { GastroColorScheme } from '@/constants/theme';
import { useGastroTheme } from '@/context/theme-context';
import { kitchenShortLabel } from '@/lib/kitchen-category-visual';
import { useCategoryLabel } from '@/lib/use-category-label';

type Props = {
  activeSlug?: string | null;
  onSelect: (slug: string) => void;
};

export function KesfetKitchenChips({ activeSlug = null, onSelect }: Props) {
  const { colors } = useGastroTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const getCategoryLabel = useCategoryLabel();

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
              {kitchenShortLabel(getCategoryLabel(cat.slug), 14)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function createStyles(colors: GastroColorScheme) {
  return StyleSheet.create({
    wrap: { flexGrow: 0, flexShrink: 0, backgroundColor: colors.bg },
    row: {
      paddingHorizontal: 12,
      paddingVertical: 3,
      gap: 4,
    },
    chip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.panel,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    chipOn: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    chipText: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '700',
    },
    chipTextOn: {
      color: colors.accent,
    },
  });
}
