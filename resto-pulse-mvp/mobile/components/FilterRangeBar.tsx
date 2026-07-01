import { useCallback, useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { GastroColorScheme } from '@/constants/theme';
import { onlineOrderInk, type OnlineOrderUiTone } from '@/constants/online-order-theme';
import { useGastroTheme } from '@/context/theme-context';
import { isLanguageRTL, type SupportedLanguage } from '@/lib/i18n';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formatValue: (value: number) => string;
  onChange: (value: number) => void;
  tone?: OnlineOrderUiTone;
};

function snapValue(raw: number, min: number, max: number, step: number): number {
  const stepped = Math.round(raw / step) * step;
  const clamped = Math.max(min, Math.min(max, stepped));
  const decimals = step < 1 ? 1 : 0;
  return Number(clamped.toFixed(decimals));
}

export function FilterRangeBar({
  label,
  value,
  min,
  max,
  step,
  formatValue,
  onChange,
  tone = 'default',
}: Props) {
  const { i18n } = useTranslation();
  const isRTL = isLanguageRTL(i18n.language as SupportedLanguage);
  const isRTLRef = useRef(isRTL);
  isRTLRef.current = isRTL;

  const { colors } = useGastroTheme();
  const styles = useMemo(() => createStyles(colors, tone), [colors, tone]);
  const trackRef = useRef<View>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const setFromPageX = useCallback(
    (pageX: number) => {
      trackRef.current?.measureInWindow((x, _y, width) => {
        if (width <= 0) return;
        const rel = pageX - x;
        const rawRatio = Math.max(0, Math.min(1, rel / width));
        // RTL: fiziksel sağ = minimum, fiziksel sol = maksimum
        const ratio = isRTLRef.current ? 1 - rawRatio : rawRatio;
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
          <View
            style={[
              styles.fill,
              isRTL
                ? { right: 0, width: `${thumbPct}%` as `${number}%` }
                : { left: 0, width: `${thumbPct}%` as `${number}%` },
            ]}
          />
        </View>
        <View
          style={[
            styles.thumb,
            isRTL
              ? { right: `${thumbPct}%` as `${number}%`, marginRight: -THUMB / 2 }
              : { left: `${thumbPct}%` as `${number}%`, marginLeft: -THUMB / 2 },
          ]}
        />
      </View>
      {/* flexDirection native RTL auto-flip'e güvenmek yerine i18n isRTL ile açıkça kontrol et */}
      <View style={[styles.edgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={styles.edge}>{formatValue(min)}</Text>
        <Text style={styles.edge}>{formatValue(max)}</Text>
      </View>
    </View>
  );
}

const THUMB = 22;

function createStyles(colors: GastroColorScheme, tone: OnlineOrderUiTone) {
  const ink = onlineOrderInk(tone, colors);
  const light = tone === 'light';
  return StyleSheet.create({
    wrap: { gap: 8 },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    label: { color: ink.text, fontSize: 14, fontWeight: '700' },
    value: { color: light ? ink.accent : colors.accent, fontSize: 14, fontWeight: '800' },
    trackHit: {
      height: 36,
      justifyContent: 'center',
      position: 'relative',
    },
    track: {
      height: 8,
      borderRadius: 4,
      backgroundColor: ink.border,
      overflow: 'hidden',
    },
    fill: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      backgroundColor: light ? ink.accent : colors.accent,
      borderRadius: 4,
    },
    thumb: {
      position: 'absolute',
      width: THUMB,
      height: THUMB,
      top: (36 - THUMB) / 2,
      borderRadius: THUMB / 2,
      backgroundColor: light ? ink.accent : colors.accent,
      borderWidth: 2,
      borderColor: light ? ink.panel : colors.panel,
    },
    edgeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    edge: { color: ink.muted, fontSize: 11, fontWeight: '600' },
  });
}
