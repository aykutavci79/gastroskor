import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';

import { KELIME_BUL_GRID_SIZE } from '@/constants/kelime-bul';
import { hucreAnahtar, hucreKoordinat, hucreYolu } from '@/lib/kelime-bul/engine';

type Theme = {
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  panel: string;
  border: string;
  foundSoft: string;
};

type Props = {
  grid: string[][];
  foundCellKeys: Set<string>;
  disabled?: boolean;
  theme: Theme;
  onSelectionEnd: (path: { row: number; col: number }[]) => void;
  onSelectingChange?: (selecting: boolean) => void;
};

type CellProps = {
  letter: string;
  cellSize: number;
  size: number;
  isFound: boolean;
  isSelected: boolean;
  theme: Theme;
};

const KelimeBulCell = memo(function KelimeBulCell({
  letter,
  cellSize,
  size,
  isFound,
  isSelected,
  theme,
}: CellProps) {
  return (
    <View
      style={[
        cellStyles.cell,
        {
          width: cellSize || `${100 / size}%`,
          height: cellSize || undefined,
          aspectRatio: cellSize ? undefined : 1,
          borderColor: theme.border,
          backgroundColor: isFound
            ? theme.foundSoft
            : isSelected
              ? theme.accentSoft
              : 'transparent',
        },
      ]}>
      <Text
        style={[
          cellStyles.letter,
          { color: theme.text, fontSize: cellSize ? Math.max(11, cellSize * 0.42) : 14 },
        ]}>
        {letter}
      </Text>
    </View>
  );
});

const cellStyles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  letter: {
    fontWeight: '800',
  },
});

export function KelimeBulGrid({
  grid,
  foundCellKeys,
  disabled = false,
  theme,
  onSelectionEnd,
  onSelectingChange,
}: Props) {
  const size = grid.length || KELIME_BUL_GRID_SIZE;
  const [cellSize, setCellSize] = useState(0);
  const [localPath, setLocalPath] = useState<{ row: number; col: number }[]>([]);
  const startRef = useRef<{ row: number; col: number } | null>(null);
  const pathRef = useRef<{ row: number; col: number }[]>([]);

  const selectedKeys = useMemo(
    () => new Set(localPath.map(({ row, col }) => hucreAnahtar(row, col))),
    [localPath],
  );

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width;
      setCellSize(Math.floor(width / size));
    },
    [size],
  );

  const hitCell = useCallback(
    (x: number, y: number): { row: number; col: number } | null => {
      if (cellSize <= 0) return null;
      const col = Math.floor(x / cellSize);
      const row = Math.floor(y / cellSize);
      if (row < 0 || col < 0 || row >= size || col >= size) return null;
      return { row, col };
    },
    [cellSize, size],
  );

  const applyPathEnd = useCallback((end: { row: number; col: number }) => {
    const start = startRef.current;
    if (!start) return;
    const path = hucreYolu(start.row, start.col, end.row, end.col);
    if (!path) return;
    pathRef.current = path;
    setLocalPath(path);
  }, []);

  const finishSelection = useCallback(
    (x: number, y: number) => {
      const end = hitCell(x, y);
      if (end) applyPathEnd(end);

      const path = pathRef.current;
      if (path.length) onSelectionEnd([...path]);

      startRef.current = null;
      pathRef.current = [];
      setLocalPath([]);
      onSelectingChange?.(false);
    },
    [applyPathEnd, hitCell, onSelectionEnd, onSelectingChange],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onStartShouldSetPanResponderCapture: () => !disabled,
        onMoveShouldSetPanResponderCapture: () => !disabled,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt) => {
          onSelectingChange?.(true);
          const cell = hitCell(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
          if (!cell) return;
          startRef.current = cell;
          pathRef.current = [cell];
          setLocalPath([cell]);
        },
        onPanResponderMove: (evt) => {
          const cell = hitCell(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
          if (cell) applyPathEnd(cell);
        },
        onPanResponderRelease: (evt) => {
          finishSelection(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
        },
        onPanResponderTerminate: () => {
          startRef.current = null;
          pathRef.current = [];
          setLocalPath([]);
          onSelectingChange?.(false);
        },
      }),
    [disabled, hitCell, applyPathEnd, finishSelection, onSelectingChange],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          width: '100%',
          aspectRatio: 1,
          borderRadius: 12,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.panel,
        },
        grid: {
          flex: 1,
          flexDirection: 'row',
          flexWrap: 'wrap',
        },
        touchLayer: {
          ...StyleSheet.absoluteFillObject,
          zIndex: 1,
        },
      }),
    [theme.border, theme.panel],
  );

  const gridPx = cellSize > 0 ? cellSize * size : undefined;

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      <View style={styles.grid} pointerEvents="none">
        {Array.from({ length: size * size }, (_, index) => {
          const { row, col } = hucreKoordinat(index, size);
          const key = hucreAnahtar(row, col);
          return (
            <KelimeBulCell
              key={key}
              letter={grid[row]?.[col] ?? ''}
              cellSize={cellSize}
              size={size}
              isFound={foundCellKeys.has(key)}
              isSelected={selectedKeys.has(key)}
              theme={theme}
            />
          );
        })}
      </View>
      {gridPx ? (
        <View
          style={[styles.touchLayer, { width: gridPx, height: gridPx }]}
          {...panResponder.panHandlers}
        />
      ) : (
        <View style={styles.touchLayer} {...panResponder.panHandlers} />
      )}
    </View>
  );
}
