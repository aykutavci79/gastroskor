import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GastroColorsLight } from '@/constants/theme';

export type OrderPaymentOption = {
  code: string;
  label: string;
};

export const DEFAULT_ORDER_PAYMENT_OPTIONS: OrderPaymentOption[] = [
  { code: 'cash', label: 'Kapıda nakit' },
  { code: 'card_at_door', label: 'Kapıda kredi / banka kartı' },
];

type Props = {
  options: OrderPaymentOption[];
  value: string | null;
  onChange: (code: string) => void;
  title: string;
  hint?: string;
};

const ACCENT = '#FF6B35';

export function OrderPaymentMethodPicker({ options, value, onChange, title, hint }: Props) {
  const rows = options.length > 0 ? options : DEFAULT_ORDER_PAYMENT_OPTIONS;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={styles.chips}>
        {rows.map((option) => {
          const selected = value === option.code;
          return (
            <Pressable
              key={option.code}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onChange(option.code)}>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  title: { fontSize: 15, fontWeight: '700', color: '#141414' },
  hint: { fontSize: 12, color: GastroColorsLight.muted, lineHeight: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  chipSelected: {
    borderColor: ACCENT,
    backgroundColor: '#FFF7ED',
  },
  chipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  chipTextSelected: { color: '#141414', fontWeight: '700' },
});
