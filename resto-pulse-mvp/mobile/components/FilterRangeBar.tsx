import { useCallback, useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';

import type { GastroColorScheme } from '@/constants/theme';
import { useGastroTheme } from '@/context/theme-context';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formatValue: (value: number) => string;
  onChange: (value: number) => void;
};

function snapValue(raw: number, min: number, max: number, step: number): number {
  const stepped = Math.round(raw / step) * step;
  const clamped = Math.max(min, Math.min(max, stepped));
  const decimals = step < 1 ? 1 : 0;
  return Number(clamped.toFixed(decimals));
}

export function FilterRangeBar({ label, value, min, max, step, formatValue, onChange }: Props) {
  const { colors } = useGastroTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const trackRef = useRef<View>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const setFromPageX = useCallback(
    (pageX: number) => {
      trackRef.current?.measureInWindow((x, _y, width) => {
        if (width <= 0) return;
        const rel = pageX - x;
        const ratio = Math.max(0, Math.min(1, rel / width));
        const next = snapValue(min + ratio * (max - min), min, max, step);
        onChangeRef.current(next);
      });
    },
    [min, max, step],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => setFromPageX(evt.nativeEvent.pageX),
        onPanResponderMove: (evt) => setFromPageX(evt.nativeEvent.pageX),
      }),
    [setFromPageX],
  );

  const ratio = max > min ? (value - min) / (max - min) : 0;
  const thumbPct = Math.max(0, Math.min(100, ratio * 100));

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{formatValue(value)}</Text>
      </View>
      <View style={styles.trackHit} ref={trackRef} {...panResponder.panHandlers}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${thumbPct}%` }]} />
        </View>
        <View style={[styles.thumb, { left: `${thumbPct}%` }]} />
      </View>
      <View style={styles.edgeRow}>
        <Text style={styles.edge}>{formatValue(min)}</Text>
        <Text style={styles.edge}>{formatValue(max)}</Text>
      </View>
    </View>
  );
}

const THUMB = 22;

function createStyles(colors: GastroColorScheme) {
  return StyleSheet.create({
    wrap: { gap: 8 },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    label: { color: colors.text, fontSize: 14, fontWeight: '700' },
    value: { color: colors.accent, fontSize: 14, fontWeight: '800' },
    trackHit: {
      height: 36,
      justifyContent: 'center',
      position: 'relative',
    },
    track: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
      overflow: 'hidden',
    },
    fill: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: colors.accent,
      borderRadius: 4,
    },
    thumb: {
      position: 'absolute',
      width: THUMB,
      height: THUMB,
      marginLeft: -THUMB / 2,
      top: (36 - THUMB) / 2,
      borderRadius: THUMB / 2,
      backgroundColor: colors.accent,
      borderWidth: 2,
      borderColor: colors.panel,
    },
    edgeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    edge: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  });
}
