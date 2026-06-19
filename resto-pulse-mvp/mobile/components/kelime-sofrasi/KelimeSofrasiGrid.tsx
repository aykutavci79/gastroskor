import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  SOFRA_GLASS_BG,
  SOFRA_GLASS_BG_FOUND,
  SOFRA_TILE_BORDER,
  SOFRA_LETTER_COLOR,
} from '@/constants/kelime-sofrasi';
import { hucreAcikMi } from '@/lib/kelime-sofrasi/engine';

import type { SofraGridCell } from '@/lib/kelime-sofrasi/types';

type Props = {
  grid: (SofraGridCell | null)[][];
  foundWordIds: string[];
  hintedCells?: string[];
  cellSize?: number;
  compact?: boolean;
};

export const KelimeSofrasiGrid = memo(function KelimeSofrasiGrid({
  grid,
  foundWordIds,
  hintedCells = [],
  cellSize = 34,
  compact = false,
}: Props) {
  const hinted = useMemo(() => new Set(hintedCells), [hintedCells]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: compact ? 0 : 6 },
        row: { flexDirection: 'row' },
        cell: {
          width: cellSize,
          height: cellSize,
          margin: compact ? 1 : 2,
          borderRadius: 9,
          borderWidth: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
        cellEmpty: { borderColor: 'transparent' },
        cellHidden: {
          borderColor: SOFRA_TILE_BORDER,
          backgroundColor: SOFRA_GLASS_BG,
        },
        cellFound: {
          borderColor: SOFRA_TILE_BORDER,
          backgroundColor: SOFRA_GLASS_BG_FOUND,
        },
        letter: { fontSize: cellSize * 0.52, fontWeight: '900', color: SOFRA_LETTER_COLOR },
      }),
    [cellSize, compact],
  );

  return (
    <View style={styles.wrap}>
      {grid.map((row, ri) => (
        <View key={`r-${ri}`} style={styles.row}>
          {row.map((cell, ci) => {
            if (!cell) {
              return <View key={`${ri}-${ci}`} style={[styles.cell, styles.cellEmpty]} />;
            }
            const revealed = hucreAcikMi(cell, foundWordIds, hinted);
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
});
