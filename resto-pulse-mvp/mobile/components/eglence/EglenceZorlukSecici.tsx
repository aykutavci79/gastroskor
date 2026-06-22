import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  eglenceZorlukEtiket,
  sofraKelimeHedefEtiket,
  SUDOKU_9X9_GIVENS,
  type EglenceZorluk,
} from '@/constants/eglence-zorluk';
import { eglenceLobbyTheme } from '@/constants/eglence-card-art-theme';
import type { EglenceGameId } from '@/constants/eglence-games';
import { useGastroTheme } from '@/context/theme-context';

type Props = {
  mode: 'sofra' | 'sudoku';
  value: EglenceZorluk;
  onChange: (z: EglenceZorluk) => void;
  /** Koyu lobi arka planı — oyun ikon teması */
  gameId?: EglenceGameId;
  /** @deprecated gameId kullan */
  tone?: 'default' | 'sudoku';
};

function zorlukAlt(mode: 'sofra' | 'sudoku', z: EglenceZorluk): string {
  if (mode === 'sofra') {
    return sofraKelimeHedefEtiket(z);
  }
  return `9×9 · ${SUDOKU_9X9_GIVENS[z]} ipucu`;
}

function zorlukDisabled(_mode: 'sofra' | 'sudoku', _z: EglenceZorluk): boolean {
  return false;
}

export function EglenceZorlukSecici({ mode, value, onChange, gameId, tone = 'default' }: Props) {
  const { colors } = useGastroTheme();
  const resolvedGameId = gameId ?? (tone === 'sudoku' ? 'mini-sudoku' : undefined);
  const t = resolvedGameId ? eglenceLobbyTheme(resolvedGameId) : null;
  const palette = t ?? colors;
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { gap: 8 },
        baslik: { fontSize: 15, fontWeight: '800', color: palette.text },
        row: { flexDirection: 'row', gap: 8 },
        chip: {
          flex: 1,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: palette.border,
          backgroundColor: t ? t.panel : colors.panel,
          paddingVertical: 10,
          paddingHorizontal: 8,
          alignItems: 'center',
          gap: 2,
        },
        chipOn: {
          borderColor: palette.accent,
          backgroundColor: t ? t.accentSoft : colors.accentSoft,
        },
        chipOff: { opacity: 0.45 },
        chipLabel: { fontSize: 14, fontWeight: '800', color: palette.text },
        chipLabelOn: { color: palette.accent },
        chipSub: { fontSize: 10, color: palette.muted, textAlign: 'center', lineHeight: 13 },
      }),
    [colors, palette, t],
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
