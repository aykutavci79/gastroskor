import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { GastroColorScheme } from '@/constants/theme';
import { GastroColorsLight } from '@/constants/theme';
import { useGastroTheme } from '@/context/theme-context';
import { gastroStopSpeaking } from '@/lib/gastro-speak';
import {
  ONLINE_ORDER_SORT_OPTIONS,
  type OnlineOrderSortMode,
} from '@/lib/online-order-sort';

type Props = {
  value: OnlineOrderSortMode;
  onChange: (mode: OnlineOrderSortMode) => void;
  tone?: 'default' | 'light';
};

export function OnlineOrderSortBar({ value, onChange, tone = 'default' }: Props) {
  const { colors } = useGastroTheme();
  const styles = useMemo(() => createStyles(colors, tone), [colors, tone]);

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
              onPress={() => {
                gastroStopSpeaking();
                onChange(opt.id);
              }}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: GastroColorScheme, tone: 'default' | 'light') {
  const ink = tone === 'light' ? GastroColorsLight : colors;
  const light = tone === 'light';
  return StyleSheet.create({
    wrap: { gap: 8 },
    label: { color: ink.muted, fontSize: 12, fontWeight: '700' },
    row: { gap: 8 },
    chip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: ink.border,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: light ? '#FFFFFF' : colors.panel,
    },
    chipOn: {
      borderColor: colors.accent,
      backgroundColor: light ? 'rgba(255, 107, 53, 0.12)' : colors.accentSoft,
    },
    chipText: { color: ink.muted, fontSize: 13, fontWeight: '700' },
    chipTextOn: { color: colors.accent, fontWeight: '800' },
  });
}
