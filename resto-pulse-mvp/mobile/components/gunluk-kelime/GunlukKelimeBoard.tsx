import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GUNLUK_KELIME_LENGTH, GUNLUK_KELIME_MAX_GUESSES } from '@/constants/gunluk-kelime';
import { gunlukKelimeGraphemes } from '@/lib/gunluk-kelime/grapheme';
import type { LetterState } from '@/lib/gunluk-kelime/engine';
import type { GunlukKelimeGuessRow } from '@/lib/gunluk-kelime/types';

function wordChars(word: string): string[] {
  return gunlukKelimeGraphemes(word);
}

type Props = {
  guesses: GunlukKelimeGuessRow[];
  current: string;
  shakeRow?: number;
};

const TILE = 56;
const GAP = 6;

function tileColors(state: LetterState) {
  switch (state) {
    case 'correct':
      return { bg: '#538D4E', border: '#538D4E', text: '#fff' };
    case 'present':
      return { bg: '#B59F3B', border: '#B59F3B', text: '#fff' };
    case 'typing':
      return { bg: 'transparent', border: '#565758', text: '#fff' };
    case 'absent':
      return { bg: '#3A3A3C', border: '#3A3A3C', text: '#fff' };
    default:
      return { bg: 'transparent', border: '#3A3A3C', text: '#fff' };
  }
}

export function GunlukKelimeBoard({ guesses, current, shakeRow }: Props) {
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { alignItems: 'center', gap: GAP },
        row: { flexDirection: 'row', gap: GAP },
        tile: {
          width: TILE,
          height: TILE,
          borderRadius: 4,
          borderWidth: 2,
          alignItems: 'center',
          justifyContent: 'center',
        },
        letter: { fontSize: 28, fontWeight: '800' },
      }),
    [],
  );

  const rows = useMemo(() => {
    const won = guesses.some((g) => g.states.every((s) => s === 'correct'));
    const out: { letters: string; states: LetterState[]; chars: string[] }[] = [];
    for (const g of guesses) {
      const chars = wordChars(g.word);
      out.push({
        letters: chars.join(''),
        states: g.states,
        chars,
      });
    }
    if (!won && guesses.length < GUNLUK_KELIME_MAX_GUESSES) {
      const chars = wordChars(current);
      while (chars.length < GUNLUK_KELIME_LENGTH) chars.push('');
      const typed = wordChars(current).length;
      const states: LetterState[] = Array.from({ length: GUNLUK_KELIME_LENGTH }, (_, i) =>
        i < typed ? 'typing' : 'empty',
      );
      out.push({ letters: chars.join(''), states, chars });
    }
    while (out.length < GUNLUK_KELIME_MAX_GUESSES) {
      out.push({
        letters: '',
        chars: Array(GUNLUK_KELIME_LENGTH).fill(''),
        states: Array(GUNLUK_KELIME_LENGTH).fill('empty'),
      });
    }
    return out;
  }, [current, guesses]);

  return (
    <View style={styles.wrap}>
      {rows.map((row, ri) => (
        <View key={`r-${ri}`} style={styles.row}>
          {Array.from({ length: GUNLUK_KELIME_LENGTH }, (_, ci) => {
            const ch = row.chars[ci] ?? '';
            const state = row.states[ci] ?? 'empty';
            const colors = tileColors(state);
            const isActiveRow = ri === guesses.length;
            return (
              <View
                key={`${ri}-${ci}`}
                style={[
                  styles.tile,
                  {
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    transform: shakeRow === ri ? [{ translateX: ci % 2 === 0 ? -2 : 2 }] : undefined,
                  },
                  isActiveRow && state === 'empty' ? { borderColor: '#818384' } : null,
                ]}>
                <Text style={[styles.letter, { color: colors.text }]}>{ch}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
