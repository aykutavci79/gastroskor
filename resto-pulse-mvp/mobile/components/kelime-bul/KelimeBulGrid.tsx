import { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
  type View as RNView,
} from 'react-native';

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

type GridLayout = {
  pageX: number;
  pageY: number;
  sizePx: number;
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
  const touchRef = useRef<RNView | null>(null);
  const layoutRef = useRef<GridLayout>({ pageX: 0, pageY: 0, sizePx: 0 });

  const selectedKeys = useMemo(
    () => new Set(localPath.map(({ row, col }) => hucreAnahtar(row, col))),
    [localPath],
  );

  const syncLayoutFromWindow = useCallback(() => {
    touchRef.current?.measureInWindow((pageX, pageY, width, height) => {
      const sizePx = Math.min(width, height);
      if (sizePx <= 0) return;
      layoutRef.current = { pageX, pageY, sizePx };
      setCellSize(Math.floor(sizePx / size));
    });
  }, [size]);

  const onLayout = useCallback(
    (_event: LayoutChangeEvent) => {
      syncLayoutFromWindow();
    },
    [syncLayoutFromWindow],
  );

  const hitCellFromPage = useCallback(
    (pageX: number, pageY: number): { row: number; col: number } | null => {
      const { pageX: originX, pageY: originY, sizePx } = layoutRef.current;
      if (sizePx <= 0) return null;

      const localX = pageX - originX;
      const localY = pageY - originY;
      if (localX < 0 || localY < 0 || localX >= sizePx || localY >= sizePx) return null;

      const step = sizePx / size;
      const col = Math.min(size - 1, Math.max(0, Math.floor(localX / step)));
      const row = Math.min(size - 1, Math.max(0, Math.floor(localY / step)));
      return { row, col };
    },
    [size],
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
    (pageX: number, pageY: number) => {
      const end = hitCellFromPage(pageX, pageY);
      if (end) applyPathEnd(end);

      const path = pathRef.current;
      if (path.length) onSelectionEnd([...path]);

      startRef.current = null;
      pathRef.current = [];
      setLocalPath([]);
      onSelectingChange?.(false);
    },
    [applyPathEnd, hitCellFromPage, onSelectionEnd, onSelectingChange],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt) => {
          onSelectingChange?.(true);
          const { pageX, pageY } = evt.nativeEvent;
          touchRef.current?.measureInWindow((originX, originY, width, height) => {
            const sizePx = Math.min(width, height);
            if (sizePx <= 0) return;
            layoutRef.current = { pageX: originX, pageY: originY, sizePx };
            setCellSize(Math.floor(sizePx / size));
            const cell = hitCellFromPage(pageX, pageY);
            if (!cell) return;
            startRef.current = cell;
            pathRef.current = [cell];
            setLocalPath([cell]);
          });
        },
        onPanResponderMove: (evt) => {
          const cell = hitCellFromPage(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
          if (cell) applyPathEnd(cell);
        },
        onPanResponderRelease: (evt) => {
          finishSelection(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
        },
        onPanResponderTerminate: () => {
          startRef.current = null;
          pathRef.current = [];
          setLocalPath([]);
          onSelectingChange?.(false);
        },
      }),
    [
      disabled,
      hitCellFromPage,
      applyPathEnd,
      finishSelection,
      onSelectingChange,
      size,
    ],
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
          position: 'absolute',
          top: 0,
          left: 0,
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
      <View
        ref={touchRef}
        style={[
          styles.touchLayer,
          gridPx ? { width: gridPx, height: gridPx } : StyleSheet.absoluteFillObject,
        ]}
        onLayout={onLayout}
        collapsable={false}
        {...panResponder.panHandlers}
      />
    </View>
  );
}
