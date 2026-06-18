import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  eglenceZorlukEtiket,
  SOFRA_KELIME_HEDEF,
  SUDOKU_6X6_GIVENS,
  type EglenceZorluk,
} from '@/constants/eglence-zorluk';
import { useGastroTheme } from '@/context/theme-context';

type Props = {
  mode: 'sofra' | 'sudoku';
  value: EglenceZorluk;
  onChange: (z: EglenceZorluk) => void;
};

function zorlukAlt(mode: 'sofra' | 'sudoku', z: EglenceZorluk): string {
  if (mode === 'sofra') {
    return `${SOFRA_KELIME_HEDEF[z]} kelime`;
  }
  if (z === 'kolay') return `6×6 · ${SUDOKU_6X6_GIVENS.kolay} ipucu`;
  if (z === 'orta') return `6×6 · ${SUDOKU_6X6_GIVENS.orta} ipucu`;
  return '9×9 · yakında';
}

function zorlukDisabled(mode: 'sofra' | 'sudoku', z: EglenceZorluk): boolean {
  return mode === 'sudoku' && z === 'zor';
}

export function EglenceZorlukSecici({ mode, value, onChange }: Props) {
  const { colors } = useGastroTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { gap: 8 },
        baslik: { fontSize: 15, fontWeight: '800', color: colors.text },
        row: { flexDirection: 'row', gap: 8 },
        chip: {
          flex: 1,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: colors.border,
          backgroundColor: colors.panel,
          paddingVertical: 10,
          paddingHorizontal: 8,
          alignItems: 'center',
          gap: 2,
        },
        chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
        chipOff: { opacity: 0.45 },
        chipLabel: { fontSize: 14, fontWeight: '800', color: colors.text },
        chipLabelOn: { color: colors.accent },
        chipSub: { fontSize: 10, color: colors.muted, textAlign: 'center', lineHeight: 13 },
      }),
    [colors],
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.baslik}>Seviye</Text>
      <View style={styles.row}>
        {(['kolay', 'orta', 'zor'] as const).map((z) => {
          const disabled = zorlukDisabled(mode, z);
          const on = value === z;
          return (
            <Pressable
              key={z}
              disabled={disabled}
              onPress={() => onChange(z)}
              style={[styles.chip, on && styles.chipOn, disabled && styles.chipOff]}>
              <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{eglenceZorlukEtiket(z)}</Text>
              <Text style={styles.chipSub}>{zorlukAlt(mode, z)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
