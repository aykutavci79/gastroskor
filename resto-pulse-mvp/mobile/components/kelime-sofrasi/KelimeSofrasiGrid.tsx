import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useGastroTheme } from '@/context/theme-context';
import type { SofraGridCell } from '@/lib/kelime-sofrasi/types';

type Props = {
  grid: (SofraGridCell | null)[][];
  foundWordIds: string[];
  cellSize?: number;
};

export function KelimeSofrasiGrid({ grid, foundWordIds, cellSize = 34 }: Props) {
  const { colors } = useGastroTheme();
  const found = useMemo(() => new Set(foundWordIds), [foundWordIds]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
        row: { flexDirection: 'row' },
        cell: {
          width: cellSize,
          height: cellSize,
          margin: 2,
          borderRadius: 8,
          borderWidth: 1.5,
          alignItems: 'center',
          justifyContent: 'center',
        },
        cellEmpty: { borderColor: 'transparent' },
        cellHidden: {
          borderColor: colors.border,
          backgroundColor: colors.panel,
        },
        cellFound: {
          borderColor: colors.accent,
          backgroundColor: colors.accentSoft,
        },
        letter: { fontSize: cellSize * 0.42, fontWeight: '800', color: colors.text },
      }),
    [cellSize, colors],
  );

  return (
    <View style={styles.wrap}>
      {grid.map((row, ri) => (
        <View key={`r-${ri}`} style={styles.row}>
          {row.map((cell, ci) => {
            if (!cell) {
              return <View key={`${ri}-${ci}`} style={[styles.cell, styles.cellEmpty]} />;
            }
            const revealed = cell.wordIds.some((id) => found.has(id));
            return (
              <View
                key={`${ri}-${ci}`}
                style={[styles.cell, revealed ? styles.cellFound : styles.cellHidden]}>
                {revealed ? <Text style={styles.letter}>{cell.letter}</Text> : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
