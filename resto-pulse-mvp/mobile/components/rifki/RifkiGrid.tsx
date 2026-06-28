import { useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { RIFKI_WOOD } from '@/constants/rifki';
import type { TileAnimMap } from '@/lib/rifki/gridAnimHelpers';
import { RIFKI_GRID_SIZE } from '@/lib/rifki/matchEngine';
import type { Grid } from '@/lib/rifki/matchEngine';

import { RifkiStonePebble } from './RifkiWoodPlank';
import { RifkiTile } from './RifkiTile';

const TILE_GAP = 3;

type RifkiGridProps = {
  grid: Grid;
  selectedTile: { row: number; col: number } | null;
  onTilePress: (row: number, col: number) => void;
  disabled?: boolean;
  accentSoft: string;
  layoutWidth?: number;
  tileAnimMap?: TileAnimMap;
  /** Taş baskısı — üst spill yoğunluğu (0–1) */
  stonePressure?: number;
};

export function RifkiGrid({
  grid,
  selectedTile,
  onTilePress,
  disabled = false,
  accentSoft,
  layoutWidth = 0,
  tileAnimMap = {},
  stonePressure = 0,
}: RifkiGridProps) {
  const [wrapWidth, setWrapWidth] = useState(0);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setWrapWidth(event.nativeEvent.layout.width);
  }, []);

  const effectiveWidth = wrapWidth > 0 ? wrapWidth : layoutWidth;

  const tileSize = useMemo(() => {
    if (effectiveWidth <= 0) return 40;
    const framePad = 12;
    const totalGap = TILE_GAP * (RIFKI_GRID_SIZE - 1);
    return Math.max(28, Math.floor((effectiveWidth - framePad * 2 - totalGap) / RIFKI_GRID_SIZE));
  }, [effectiveWidth]);

  const spillCols = stonePressure >= 0.5 ? 3 : stonePressure >= 0.25 ? 2 : 1;

  return (
    <View style={styles.outerFrame}>
      <View style={styles.spillStrip}>
        {Array.from({ length: spillCols * 4 }, (_, i) => (
          <RifkiStonePebble key={`spill-${i}`} size={10 + (i % 3) * 2} variant={i} />
        ))}
      </View>

      <View style={styles.cornerStones} pointerEvents="none">
        {Array.from({ length: 6 }, (_, i) => (
          <RifkiStonePebble
            key={`corner-${i}`}
            size={8 + (i % 2) * 3}
            variant={i + 2}
          />
        ))}
      </View>

      <View style={styles.wrap} onLayout={onLayout}>
        {grid.map((row, rowIndex) => (
          <View
            key={`row-${rowIndex}`}
            style={[styles.row, rowIndex === grid.length - 1 ? { marginBottom: 0 } : null]}>
            {row.map((tile, colIndex) => {
              if (!tile) {
                return (
                  <View
                    key={`empty-${rowIndex}-${colIndex}`}
                    style={[styles.emptyCell, { width: tileSize, height: tileSize }]}>
                    {(rowIndex + colIndex) % 3 === 0 ? (
                      <RifkiStonePebble size={tileSize * 0.3} variant={rowIndex + colIndex} />
                    ) : null}
                  </View>
                );
              }
              const isSelected = selectedTile?.row === rowIndex && selectedTile?.col === colIndex;
              return (
                <RifkiTile
                  key={tile.id}
                  tile={tile}
                  size={tileSize}
                  onPress={onTilePress}
                  isSelected={isSelected}
                  disabled={disabled}
                  accentSoft={accentSoft}
                  animHint={tileAnimMap[tile.id]}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerFrame: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 4,
    borderColor: RIFKI_WOOD.plankDark,
    backgroundColor: RIFKI_WOOD.frame,
    paddingTop: 10,
    paddingHorizontal: 6,
    paddingBottom: 6,
    overflow: 'visible',
  },
  spillStrip: {
    position: 'absolute',
    top: -6,
    left: 12,
    right: 12,
    height: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    zIndex: 2,
    justifyContent: 'center',
  },
  cornerStones: {
    position: 'absolute',
    top: 18,
    left: 10,
    width: 52,
    height: 52,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    zIndex: 1,
    opacity: 0.9,
  },
  wrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: RIFKI_WOOD.tunnelInner,
    padding: 6,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: RIFKI_WOOD.plankDark,
  },
  row: {
    flexDirection: 'row',
    gap: TILE_GAP,
    marginBottom: TILE_GAP,
  },
  emptyCell: {
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
