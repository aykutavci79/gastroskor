import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MINI_SUDOKU_THEME } from '@/constants/mini-sudoku-theme';
import { DIGITS, SUDOKU_BOARD_COLORS } from '@/lib/mini-sudoku/constants';
import type { Digit } from '@/lib/mini-sudoku/constants';

type Props = {
  remaining: Record<Digit, number>;
  onPick: (digit: Digit) => void;
  disabled?: boolean;
  highlightDigit?: Digit | null;
};

export function MiniSudokuPad({ remaining, onPick, disabled, highlightDigit }: Props) {
  const t = MINI_SUDOKU_THEME;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          marginTop: 12,
          borderTopWidth: 1,
          borderTopColor: t.border,
          paddingTop: 10,
        },
        row: { flexDirection: 'row', justifyContent: 'center' },
        key: {
          flex: 1,
          maxWidth: 42,
          alignItems: 'center',
          paddingVertical: 8,
          borderRadius: 8,
        },
        keyPressed: { opacity: 0.85 },
        keyHighlight: { backgroundColor: t.accentSoft },
        keyText: { fontSize: 20, fontWeight: '700', color: t.text },
        countText: {
          marginTop: 2,
          fontSize: 11,
          fontWeight: '600',
          color: SUDOKU_BOARD_COLORS.padCount,
        },
        countZero: { opacity: 0.35 },
      }),
    [t],
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {DIGITS.map((digit) => {
          const left = remaining[digit] ?? 0;
          const exhausted = left <= 0;
          return (
            <Pressable
              key={digit}
              disabled={disabled || exhausted}
              onPress={() => onPick(digit)}
              style={({ pressed }) => [
                styles.key,
                highlightDigit === digit && styles.keyHighlight,
                pressed && styles.keyPressed,
                exhausted && styles.countZero,
              ]}>
              <Text style={styles.keyText}>{digit}</Text>
              <Text style={[styles.countText, exhausted && styles.countZero]}>{left}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
