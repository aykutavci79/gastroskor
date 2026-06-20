import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LetterState } from '@/lib/gunluk-kelime/engine';

/** Türkçe 29 harf — Q klavye Wordle düzeni (I ve İ ayrı). */
const ROWS = [
  ['E', 'R', 'T', 'Y', 'U', 'I', 'İ', 'O', 'P', 'Ğ', 'Ü'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'V'],
  ['ENTER', 'Z', 'C', 'B', 'N', 'M', 'Ö', 'Ç', '⌫'],
] as const;

type Props = {
  letterStates: Record<string, LetterState>;
  disabled?: boolean;
  onKey: (key: string) => void;
};

function keyBg(state: LetterState | undefined): string {
  switch (state) {
    case 'correct':
      return '#538D4E';
    case 'present':
      return '#B59F3B';
    case 'absent':
      return '#3A3A3C';
    default:
      return '#818384';
  }
}

export function GunlukKelimeKeyboard({ letterStates, disabled, onKey }: Props) {
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { gap: 8, paddingHorizontal: 2 },
        row: { flexDirection: 'row', justifyContent: 'center', gap: 5, flexWrap: 'wrap' },
        key: {
          minWidth: 30,
          height: 46,
          paddingHorizontal: 6,
          borderRadius: 4,
          alignItems: 'center',
          justifyContent: 'center',
        },
        keyWide: { minWidth: 52, paddingHorizontal: 10 },
        keyEnter: { minWidth: 48 },
        label: { color: '#fff', fontSize: 12, fontWeight: '800' },
        labelSm: { fontSize: 10 },
      }),
    [],
  );

  return (
    <View style={styles.wrap}>
      {ROWS.map((row, ri) => (
        <View key={`kr-${ri}`} style={styles.row}>
          {row.map((key) => {
            const isEnter = key === 'ENTER';
            const isBack = key === '⌫';
            const state = !isEnter && !isBack ? letterStates[key] : undefined;
            return (
              <Pressable
                key={key}
                disabled={disabled}
                onPress={() => onKey(isEnter ? 'ENTER' : isBack ? 'BACK' : key)}
                style={({ pressed }) => [
                  styles.key,
                  isEnter ? styles.keyEnter : null,
                  isBack ? styles.keyWide : null,
                  { backgroundColor: keyBg(state), opacity: pressed ? 0.85 : 1 },
                ]}>
                <Text style={[styles.label, isEnter ? styles.labelSm : null]}>
                  {isEnter ? 'GİR' : key}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
