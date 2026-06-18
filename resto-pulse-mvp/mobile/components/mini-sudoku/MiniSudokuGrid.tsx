import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BOX_COLS, BOX_ROWS, DIGITS, SIZE } from '@/lib/mini-sudoku/constants';
import { hasConflict, isGiven } from '@/lib/mini-sudoku/engine';
import type { Digit } from '@/lib/mini-sudoku/constants';
import type { Grid } from '@/lib/mini-sudoku/types';
import { useGastroTheme } from '@/context/theme-context';

type Props = {
  givens: Grid;
  values: Grid;
  notes: Digit[][][];
  selected: { row: number; col: number } | null;
  onSelect: (row: number, col: number) => void;
};

function sameBox(a: { row: number; col: number }, b: { row: number; col: number }): boolean {
  return (
    Math.floor(a.row / BOX_ROWS) === Math.floor(b.row / BOX_ROWS) &&
    Math.floor(a.col / BOX_COLS) === Math.floor(b.col / BOX_COLS)
  );
}

export function MiniSudokuGrid({ givens, values, notes, selected, onSelect }: Props) {
  const { colors } = useGastroTheme();
  const selectedValue = selected ? values[selected.row]![selected.col]! : 0;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          alignSelf: 'center',
          borderWidth: 2,
          borderColor: colors.text,
          borderRadius: 8,
          overflow: 'hidden',
          backgroundColor: colors.panel,
        },
        row: { flexDirection: 'row' },
        cell: {
          width: 48,
          height: 48,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.input,
        },
        cellThickRight: { borderRightWidth: 2, borderRightColor: colors.text },
        cellThickBottom: { borderBottomWidth: 2, borderBottomColor: colors.text },
        cellSelected: { backgroundColor: 'rgba(255, 107, 53, 0.52)' },
        cellMatch: { backgroundColor: 'rgba(255, 183, 3, 0.32)' },
        cellPeer: { backgroundColor: 'rgba(66, 133, 244, 0.34)' },
        cellConflict: { backgroundColor: 'rgba(239, 68, 68, 0.22)' },
        value: { fontSize: 22, fontWeight: '700', color: colors.text },
        given: { color: colors.text },
        user: { color: colors.accent },
        match: { color: colors.gold },
        notesWrap: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 1,
          padding: 2,
        },
        note: { width: 14, fontSize: 9, textAlign: 'center', color: colors.muted },
      }),
    [colors],
  );

  return (
    <View style={styles.wrap}>
      {Array.from({ length: SIZE }, (_, row) => (
        <View key={`r-${row}`} style={styles.row}>
          {Array.from({ length: SIZE }, (_, col) => {
            const value = values[row]![col]!;
            const fixed = isGiven(givens, row, col);
            const conflict = !fixed && value > 0 && hasConflict(values, row, col);
            const isSelected = selected?.row === row && selected?.col === col;
            const isPeer =
              selected != null &&
              !isSelected &&
              (selected.row === row || selected.col === col || sameBox(selected, { row, col }));
            const isMatch = selectedValue > 0 && value === selectedValue;

            const cellNotes = notes[row]![col]!;

            return (
              <Pressable
                key={`c-${row}-${col}`}
                onPress={() => onSelect(row, col)}
                style={[
                  styles.cell,
                  col % BOX_COLS === BOX_COLS - 1 && col < SIZE - 1 ? styles.cellThickRight : null,
                  row % BOX_ROWS === BOX_ROWS - 1 && row < SIZE - 1 ? styles.cellThickBottom : null,
                  isSelected
                    ? styles.cellSelected
                    : isMatch
                      ? styles.cellMatch
                      : isPeer
                        ? styles.cellPeer
                        : null,
                  conflict ? styles.cellConflict : null,
                ]}>
                {value > 0 ? (
                  <Text
                    style={[
                      styles.value,
                      fixed ? styles.given : styles.user,
                      isMatch && !isSelected ? styles.match : null,
                    ]}>
                    {value}
                  </Text>
                ) : cellNotes.length > 0 ? (
                  <View style={styles.notesWrap}>
                    {DIGITS.map((d) => (
                      <Text key={d} style={styles.note}>
                        {cellNotes.includes(d) ? d : ' '}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
