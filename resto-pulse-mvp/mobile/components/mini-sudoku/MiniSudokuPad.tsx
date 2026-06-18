import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DIGITS } from '@/lib/mini-sudoku/constants';
import type { Digit } from '@/lib/mini-sudoku/constants';
import { useGastroTheme } from '@/context/theme-context';

type Props = {
  noteMode: boolean;
  onPick: (digit: Digit) => void;
  onErase: () => void;
  disabled?: boolean;
};

export function MiniSudokuPad({ noteMode, onPick, onErase, disabled }: Props) {
  const { colors } = useGastroTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { gap: 10, marginTop: 20 },
        row: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
        key: {
          width: 52,
          height: 52,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.input,
          borderWidth: 1,
          borderColor: colors.border,
        },
        keyPressed: { opacity: 0.85 },
        keyText: { fontSize: 22, fontWeight: '700', color: colors.text },
        erase: {
          marginTop: 4,
          alignSelf: 'center',
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.border,
        },
        eraseText: { color: colors.muted, fontWeight: '600' },
        hint: { textAlign: 'center', color: colors.muted, fontSize: 12, marginBottom: 4 },
      }),
    [colors],
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>{noteMode ? 'Not modu: rakama dokun' : 'Rakam sec veya sil'}</Text>
      <View style={styles.row}>
        {DIGITS.slice(0, 3).map((digit) => (
          <Pressable
            key={digit}
            disabled={disabled}
            onPress={() => onPick(digit)}
            style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}>
            <Text style={styles.keyText}>{digit}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.row}>
        {DIGITS.slice(3).map((digit) => (
          <Pressable
            key={digit}
            disabled={disabled}
            onPress={() => onPick(digit)}
            style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}>
            <Text style={styles.keyText}>{digit}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable disabled={disabled} onPress={onErase} style={styles.erase}>
        <Text style={styles.eraseText}>Sil</Text>
      </Pressable>
    </View>
  );
}
