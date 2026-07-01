import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { GastroColorScheme } from '@/constants/theme';
import { onlineOrderInk, type OnlineOrderUiTone } from '@/constants/online-order-theme';
import { useGastroTheme } from '@/context/theme-context';
import { gastroStopSpeaking } from '@/lib/gastro-speak';
import {
  ONLINE_ORDER_SORT_OPTIONS,
  type OnlineOrderSortMode,
} from '@/lib/online-order-sort';

const SORT_LABEL_KEYS: Record<OnlineOrderSortMode, string> = {
  gastro_score: 'order.sortGastroScore',
  distance: 'order.sortDistance',
  rating: 'order.sortRating',
  popularity: 'order.sortPopularity',
  discount: 'order.sortDiscount',
};

type Props = {
  value: OnlineOrderSortMode;
  onChange: (mode: OnlineOrderSortMode) => void;
  tone?: OnlineOrderUiTone;
};

export function OnlineOrderSortBar({ value, onChange, tone = 'default' }: Props) {
  const { t } = useTranslation();
  const { colors } = useGastroTheme();
  const styles = useMemo(() => createStyles(colors, tone), [colors, tone]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{t('order.sortLabel')}</Text>
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
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{t(SORT_LABEL_KEYS[opt.id])}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: GastroColorScheme, tone: OnlineOrderUiTone) {
  const ink = onlineOrderInk(tone, colors);
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
      backgroundColor: light ? ink.panel : colors.panel,
    },
    chipOn: {
      borderColor: ink.accent,
      backgroundColor: light ? ink.accentSoft : colors.accentSoft,
    },
    chipText: { color: ink.muted, fontSize: 13, fontWeight: '700' },
    chipTextOn: { color: ink.accent, fontWeight: '800' },
  });
}
