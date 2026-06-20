import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { BOX_COLS, BOX_ROWS, DIGITS, SIZE, SUDOKU_BOARD_COLORS } from '@/lib/mini-sudoku/constants';
import { hasConflict, isGiven } from '@/lib/mini-sudoku/engine';
import type { Digit } from '@/lib/mini-sudoku/constants';
import type { Grid } from '@/lib/mini-sudoku/types';

type Props = {
  givens: Grid;
  values: Grid;
  notes: Digit[][][];
  selected: { row: number; col: number } | null;
  onSelect: (row: number, col: number) => void;
};

export function MiniSudokuGrid({ givens, values, notes, selected, onSelect }: Props) {
  const { width } = useWindowDimensions();
  const selectedValue = selected ? values[selected.row]![selected.col]! : 0;

  const cellSize = useMemo(() => {
    const budget = Math.min(width - 32, 380);
    return Math.max(30, Math.floor(budget / SIZE));
  }, [width]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          alignSelf: 'center',
          borderWidth: 2,
          borderColor: SUDOKU_BOARD_COLORS.lineThick,
          borderRadius: 8,
          overflow: 'hidden',
          backgroundColor: SUDOKU_BOARD_COLORS.bg,
          shadowColor: '#FF6B35',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.35,
          shadowRadius: 12,
          elevation: 8,
        },
        row: { flexDirection: 'row' },
        cell: {
          width: cellSize,
          height: cellSize,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: SUDOKU_BOARD_COLORS.line,
          backgroundColor: SUDOKU_BOARD_COLORS.bg,
        },
        cellThickRight: {
          borderRightWidth: 2,
          borderRightColor: SUDOKU_BOARD_COLORS.lineThick,
        },
        cellThickBottom: {
          borderBottomWidth: 2,
          borderBottomColor: SUDOKU_BOARD_COLORS.lineThick,
        },
        cellSelected: { backgroundColor: SUDOKU_BOARD_COLORS.cellSelected },
        cellMatch: { backgroundColor: SUDOKU_BOARD_COLORS.cellMatch },
        cellConflict: { backgroundColor: SUDOKU_BOARD_COLORS.cellConflict },
        value: {
          fontSize: Math.max(14, Math.floor(cellSize * 0.46)),
          fontWeight: '700',
        },
        given: { color: SUDOKU_BOARD_COLORS.givenText },
        user: { color: SUDOKU_BOARD_COLORS.userText },
        match: { color: SUDOKU_BOARD_COLORS.userText, fontWeight: '800' },
        notesWrap: { width: '100%', height: '100%', justifyContent: 'center', padding: 1 },
        notesRow: { flexDirection: 'row', justifyContent: 'center' },
        note: {
          fontSize: Math.max(7, Math.floor(cellSize * 0.18)),
          textAlign: 'center',
          color: SUDOKU_BOARD_COLORS.noteText,
        },
      }),
    [cellSize],
  );

  const noteCellWidth = Math.floor(cellSize / 3) - 1;

  return (
    <View style={styles.wrap}>
      {Array.from({ length: SIZE }, (_, row) => (
        <View key={`r-${row}`} style={styles.row}>
          {Array.from({ length: SIZE }, (_, col) => {
            const value = values[row]![col]!;
            const fixed = isGiven(givens, row, col);
            const conflict = !fixed && value > 0 && hasConflict(values, row, col);
            const isSelected = selected?.row === row && selected?.col === col;
            const isMatch = selectedValue > 0 && value === selectedValue && !isSelected;
            const cellNotes = notes[row]![col]!;

            return (
              <Pressable
                key={`c-${row}-${col}`}
                onPress={() => onSelect(row, col)}
                style={[
                  styles.cell,
                  col % BOX_COLS === BOX_COLS - 1 && col < SIZE - 1 ? styles.cellThickRight : null,
                  row % BOX_ROWS === BOX_ROWS - 1 && row < SIZE - 1 ? styles.cellThickBottom : null,
                  isSelected ? styles.cellSelected : isMatch ? styles.cellMatch : null,
                  conflict ? styles.cellConflict : null,
                ]}>
                {value > 0 ? (
                  <Text
                    style={[
                      styles.value,
                      fixed ? styles.given : styles.user,
                      isMatch ? styles.match : null,
                    ]}>
                    {value}
                  </Text>
                ) : cellNotes.length > 0 ? (
                  <View style={styles.notesWrap}>
                    {Array.from({ length: 3 }, (_, noteRow) => (
                      <View key={`nr-${noteRow}`} style={styles.notesRow}>
                        {DIGITS.slice(noteRow * 3, noteRow * 3 + 3).map((d) => (
                          <Text key={d} style={[styles.note, { width: noteCellWidth }]}>
                            {cellNotes.includes(d) ? d : ' '}
                          </Text>
                        ))}
                      </View>
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
