import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ReservationTheme } from '@/constants/reservation-theme';

type Props = {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
};

export function ReservationPartySizeStepper({ value, min = 1, max = 20, onChange }: Props) {
  const { t } = useTranslation();
  const canDec = value > min;
  const canInc = value < max;

  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.btn, !canDec && styles.btnDisabled]}
        disabled={!canDec}
        onPress={() => onChange(Math.max(min, value - 1))}
        accessibilityRole="button"
        accessibilityLabel={t('rezervasyon.decreaseParty')}>
        <Text style={styles.btnText}>−</Text>
      </Pressable>
      <View style={styles.valueBox}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{t('rezervasyon.personUnit')}</Text>
      </View>
      <Pressable
        style={[styles.btn, !canInc && styles.btnDisabled]}
        disabled={!canInc}
        onPress={() => onChange(Math.min(max, value + 1))}
        accessibilityRole="button"
        accessibilityLabel={t('rezervasyon.increaseParty')}>
        <Text style={styles.btnText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ReservationTheme.accentGlow,
    borderWidth: 1,
    borderColor: ReservationTheme.border,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: {
    color: ReservationTheme.accent,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
  },
  valueBox: {
    minWidth: 72,
    alignItems: 'center',
    gap: 2,
  },
  value: {
    color: ReservationTheme.text,
    fontSize: 28,
    fontWeight: '800',
  },
  label: {
    color: ReservationTheme.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});
