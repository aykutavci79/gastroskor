import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';

import {
  SOFRA_GLASS_BG,
  SOFRA_GLASS_BG_ACTIVE,
  SOFRA_GLASS_BORDER,
  SOFRA_LETTER_COLOR,
} from '@/constants/kelime-sofrasi';
import { useGastroTheme } from '@/context/theme-context';

type Props = {
  wheel: string[];
  order: number[];
  selectedPath: number[];
  diameter: number;
  onPathChange: (path: number[]) => void;
  onCommit: (path: number[]) => void;
  onShuffle: () => void;
  onHint?: () => void;
  hintsLeft?: number;
  disabled?: boolean;
};

type Pt = { x: number; y: number };

function lineBetween(p1: Pt, p2: Pt, color: string, thickness: number) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  return {
    position: 'absolute' as const,
    left: midX - len / 2,
    top: midY - thickness / 2,
    width: len,
    height: thickness,
    borderRadius: thickness / 2,
    backgroundColor: color,
    transform: [{ rotate: `${angle}rad` }],
  };
}

export function KelimeSofrasiWheel({
  wheel,
  order,
  selectedPath,
  diameter,
  onPathChange,
  onCommit,
  onShuffle,
  onHint,
  hintsLeft = 0,
  disabled,
}: Props) {
  const { colors } = useGastroTheme();
  const [finger, setFinger] = useState<Pt | null>(null);
  const pathRef = useRef<number[]>([]);

  const letterSize = Math.max(30, Math.round(diameter * 0.155));
  const hitRadius = Math.max(22, Math.round(diameter * 0.11));
  const lineThickness = Math.max(4, Math.round(diameter * 0.02));
  const letterFont = Math.max(14, Math.round(letterSize * 0.42));
  const previewFont = Math.max(16, Math.round(diameter * 0.09));

  const selectedSet = useMemo(() => new Set(selectedPath), [selectedPath]);

  const centers = useMemo<Pt[]>(() => {
    if (diameter <= 0) return [];
    const center = diameter / 2;
    const radius = center - letterSize / 2 - 4;
    const n = order.length;
    return order.map((_, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      return {
        x: center + Math.cos(angle) * radius,
        y: center + Math.sin(angle) * radius,
      };
    });
  }, [diameter, letterSize, order]);

  const findLetterAt = useCallback(
    (pt: Pt): number | null => {
      for (let i = 0; i < centers.length; i++) {
        const c = centers[i]!;
        if (Math.hypot(c.x - pt.x, c.y - pt.y) <= hitRadius) {
          return order[i]!;
        }
      }
      return null;
    },
    [centers, hitRadius, order],
  );

  const handlePoint = useCallback(
    (pt: Pt) => {
      const wheelIndex = findLetterAt(pt);
      if (wheelIndex == null) return;
      const path = pathRef.current;
      const pos = path.indexOf(wheelIndex);
      if (pos === -1) {
        pathRef.current = [...path, wheelIndex];
        void Haptics.selectionAsync();
        onPathChange(pathRef.current);
      } else if (pos === path.length - 2) {
        pathRef.current = path.slice(0, -1);
        onPathChange(pathRef.current);
      }
    },
    [findLetterAt, onPathChange],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: (e: GestureResponderEvent) => {
          pathRef.current = [];
          const pt = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
          setFinger(pt);
          handlePoint(pt);
        },
        onPanResponderMove: (e: GestureResponderEvent) => {
          const pt = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
          setFinger(pt);
          handlePoint(pt);
        },
        onPanResponderRelease: () => {
          setFinger(null);
          onCommit(pathRef.current);
          pathRef.current = [];
        },
        onPanResponderTerminate: () => {
          setFinger(null);
          onCommit(pathRef.current);
          pathRef.current = [];
        },
      }),
    [disabled, handlePoint, onCommit],
  );

  const onLayout = useCallback((_e: LayoutChangeEvent) => {}, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { width: diameter, alignSelf: 'center', overflow: 'visible' },
        previewWrap: { alignItems: 'center', marginBottom: 4, minHeight: previewFont + 14 },
        previewPill: {
          paddingHorizontal: 16,
          paddingVertical: 5,
          borderRadius: 20,
          backgroundColor: colors.accent,
        },
        previewText: { color: '#fff', fontSize: previewFont, fontWeight: '900', letterSpacing: 2 },
        wrap: { width: diameter, height: diameter, alignSelf: 'center', overflow: 'hidden' },
        ring: {
          ...StyleSheet.absoluteFillObject,
          borderRadius: 999,
          borderWidth: 2,
          borderColor: SOFRA_GLASS_BORDER,
          backgroundColor: SOFRA_GLASS_BG,
        },
        lineLayer: { ...StyleSheet.absoluteFillObject },
        letter: {
          position: 'absolute',
          width: letterSize,
          height: letterSize,
          marginLeft: -letterSize / 2,
          marginTop: -letterSize / 2,
          borderRadius: letterSize / 2,
          borderWidth: 2,
          alignItems: 'center',
          justifyContent: 'center',
        },
        letterIdle: {
          borderColor: SOFRA_GLASS_BORDER,
          backgroundColor: SOFRA_GLASS_BG,
        },
        letterSelected: {
          borderColor: 'rgba(70, 130, 200, 0.75)',
          backgroundColor: SOFRA_GLASS_BG_ACTIVE,
        },
        letterText: { fontSize: letterFont, fontWeight: '900', color: SOFRA_LETTER_COLOR },
        letterTextSelected: { color: SOFRA_LETTER_COLOR },
        toolbar: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 6 },
        toolBtn: {
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: SOFRA_GLASS_BORDER,
          backgroundColor: SOFRA_GLASS_BG,
        },
        toolText: { color: SOFRA_LETTER_COLOR, fontWeight: '800', fontSize: 12 },
      }),
    [colors, diameter, letterFont, letterSize, previewFont],
  );

  const currentWord = selectedPath.map((i) => wheel[i]).join('');

  const segments: { key: string; style: ReturnType<typeof lineBetween> }[] = [];
  if (centers.length === order.length) {
    for (let i = 0; i < selectedPath.length - 1; i++) {
      const a = order.indexOf(selectedPath[i]!);
      const b = order.indexOf(selectedPath[i + 1]!);
      if (a >= 0 && b >= 0) {
        segments.push({
          key: `seg-${i}`,
          style: lineBetween(centers[a]!, centers[b]!, colors.accent, lineThickness),
        });
      }
    }
    if (finger && selectedPath.length > 0) {
      const last = order.indexOf(selectedPath[selectedPath.length - 1]!);
      if (last >= 0) {
        segments.push({
          key: 'seg-finger',
          style: lineBetween(centers[last]!, finger, colors.accentSoft, lineThickness),
        });
      }
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.previewWrap}>
        {currentWord ? (
          <View style={styles.previewPill}>
            <Text style={styles.previewText}>{currentWord}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.wrap} onLayout={onLayout} {...panResponder.panHandlers}>
        <View style={styles.ring} pointerEvents="none" />

        <View style={styles.lineLayer} pointerEvents="none">
          {segments.map((s) => (
            <View key={s.key} style={s.style} />
          ))}
        </View>

        {centers.length === order.length
          ? order.map((wheelIndex, displayIndex) => {
              const c = centers[displayIndex]!;
              const selected = selectedSet.has(wheelIndex);
              return (
                <View
                  key={`${wheelIndex}-${displayIndex}`}
                  pointerEvents="none"
                  style={[
                    styles.letter,
                    { left: c.x, top: c.y },
                    selected ? styles.letterSelected : styles.letterIdle,
                  ]}>
                  <Text style={[styles.letterText, selected ? styles.letterTextSelected : null]}>
                    {wheel[wheelIndex]}
                  </Text>
                </View>
              );
            })
          : null}
      </View>

      <View style={styles.toolbar}>
        {onHint ? (
          <Pressable
            style={styles.toolBtn}
            onPress={onHint}
            disabled={disabled || hintsLeft <= 0}>
            <Text style={styles.toolText}>İpucu ({hintsLeft})</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.toolBtn} onPress={onShuffle} disabled={disabled}>
          <Text style={styles.toolText}>Karıştır</Text>
        </Pressable>
      </View>
    </View>
  );
}
