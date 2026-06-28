import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';

import {
  SOFRA_GLASS_BG,
  SOFRA_GLASS_BORDER,
  SOFRA_LETTER_COLOR,
  SOFRA_WHEEL_FONT_FAMILY,
} from '@/constants/kelime-sofrasi';
import { useGastroTheme } from '@/context/theme-context';
import { playHubSfx } from '@/lib/gastro-hub-sfx';

type Props = {
  wheel: string[];
  order: number[];
  selectedPath: number[];
  diameter: number;
  onPathChange: (path: number[]) => void;
  onCommit: (path: number[]) => void;
  onShuffle: () => void;
  disabled?: boolean;
};

type Pt = { x: number; y: number };

/** Gorsel halka capi — layout merkezi ve harf boyutu ayni kalir */
const RING_SCALE = 0.8;
/** Harf orbitini merkeze cekme (~%16); ikonla cakismayi onlemek icin alt sinir ayri */
const ORBIT_RADIUS_SCALE = 0.84;
const SHUFFLE_HIT_SLOP = 12;

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

export const KelimeSofrasiWheel = memo(function KelimeSofrasiWheel({
  wheel,
  order,
  selectedPath,
  diameter,
  onPathChange,
  onCommit,
  onShuffle,
  disabled,
}: Props) {
  const { colors } = useGastroTheme();
  const [finger, setFinger] = useState<Pt | null>(null);
  const pathRef = useRef<number[]>([]);
  const fingerRef = useRef<Pt | null>(null);
  const fingerFrameRef = useRef<number | null>(null);
  const hoverLetterRef = useRef<number | null>(null);

  const setFingerThrottled = useCallback((pt: Pt) => {
    fingerRef.current = pt;
    if (fingerFrameRef.current != null) return;
    fingerFrameRef.current = requestAnimationFrame(() => {
      fingerFrameRef.current = null;
      setFinger(fingerRef.current);
    });
  }, []);

  const letterHit = Math.max(38, Math.round(diameter * 0.19));
  const hitRadius = Math.max(26, Math.round(diameter * 0.12));
  const lineThickness = Math.max(4, Math.round(diameter * 0.02));
  const letterFont = Math.max(24, Math.round(letterHit * 0.64));
  const previewFont = Math.max(16, Math.round(diameter * 0.09));
  const ringDiameter = Math.round(diameter * RING_SCALE);
  const ringInset = (diameter - ringDiameter) / 2;
  const wheelCenter = diameter / 2;
  const shuffleBtnSize = Math.max(40, Math.round(ringDiameter * 0.24));
  const shuffleIconSize = Math.max(22, Math.round(shuffleBtnSize * 0.5));
  const shuffleHitRadius = shuffleBtnSize / 2 + SHUFFLE_HIT_SLOP;

  const isShuffleTouch = useCallback(
    (x: number, y: number) => Math.hypot(x - wheelCenter, y - wheelCenter) <= shuffleHitRadius,
    [shuffleHitRadius, wheelCenter],
  );

  const selectedSet = useMemo(() => new Set(selectedPath), [selectedPath]);

  const centers = useMemo<Pt[]>(() => {
    if (diameter <= 0) return [];
    const center = diameter / 2;
    const rawOrbitRadius = ringDiameter / 2 - letterFont * 0.45;
    const minOrbitRadius = shuffleBtnSize / 2 + letterHit * 0.32 + 6;
    const orbitRadius = Math.max(minOrbitRadius, rawOrbitRadius * ORBIT_RADIUS_SCALE);
    const n = order.length;
    return order.map((_, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      return {
        x: center + Math.cos(angle) * orbitRadius,
        y: center + Math.sin(angle) * orbitRadius,
      };
    });
  }, [diameter, letterFont, letterHit, order, ringDiameter, shuffleBtnSize]);

  const findLetterAt = useCallback(
    (pt: Pt): number | null => {
      if (isShuffleTouch(pt.x, pt.y)) return null;
      for (let i = 0; i < centers.length; i++) {
        const c = centers[i]!;
        if (Math.hypot(c.x - pt.x, c.y - pt.y) <= hitRadius) {
          return order[i]!;
        }
      }
      return null;
    },
    [centers, hitRadius, isShuffleTouch, order],
  );

  const handlePoint = useCallback(
    (pt: Pt) => {
      const wheelIndex = findLetterAt(pt);
      if (wheelIndex == null) {
        hoverLetterRef.current = null;
        return;
      }
      if (hoverLetterRef.current !== wheelIndex) {
        hoverLetterRef.current = wheelIndex;
        playHubSfx('waterdrop');
      }
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
        onStartShouldSetPanResponder: (e) => {
          if (disabled) return false;
          const { locationX, locationY } = e.nativeEvent;
          return !isShuffleTouch(locationX, locationY);
        },
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: (e: GestureResponderEvent) => {
          pathRef.current = [];
          hoverLetterRef.current = null;
          const pt = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
          setFinger(pt);
          handlePoint(pt);
        },
        onPanResponderMove: (e: GestureResponderEvent) => {
          const pt = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
          setFingerThrottled(pt);
          handlePoint(pt);
        },
        onPanResponderRelease: () => {
          setFinger(null);
          hoverLetterRef.current = null;
          onCommit(pathRef.current);
          pathRef.current = [];
        },
        onPanResponderTerminate: () => {
          setFinger(null);
          hoverLetterRef.current = null;
          onCommit(pathRef.current);
          pathRef.current = [];
        },
      }),
    [disabled, handlePoint, isShuffleTouch, onCommit, setFingerThrottled],
  );

  const onLayout = useCallback((_e: LayoutChangeEvent) => {}, []);

  const handleShufflePress = useCallback(() => {
    if (disabled) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onShuffle();
  }, [disabled, onShuffle]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { width: diameter, alignSelf: 'center', overflow: 'visible' },
        previewWrap: { alignItems: 'center', marginBottom: 2 },
        previewWrapActive: { minHeight: previewFont + 8 },
        previewPill: {
          paddingHorizontal: 16,
          paddingVertical: 5,
          borderRadius: 20,
          backgroundColor: colors.accent,
        },
        previewText: {
          color: '#fff',
          fontSize: previewFont,
          fontFamily: SOFRA_WHEEL_FONT_FAMILY,
          letterSpacing: 2,
        },
        wrap: { width: diameter, height: diameter, alignSelf: 'center' },
        wheelStage: {
          width: diameter,
          height: diameter,
          alignSelf: 'center',
          position: 'relative',
        },
        ring: {
          position: 'absolute',
          left: ringInset,
          top: ringInset,
          width: ringDiameter,
          height: ringDiameter,
          borderRadius: ringDiameter / 2,
          borderWidth: 2,
          borderColor: SOFRA_GLASS_BORDER,
          backgroundColor: SOFRA_GLASS_BG,
        },
        lineLayer: { ...StyleSheet.absoluteFillObject },
        letterAnchor: {
          position: 'absolute',
          width: letterHit,
          height: letterHit,
          marginLeft: -letterHit / 2,
          marginTop: -letterHit / 2,
          alignItems: 'center',
          justifyContent: 'center',
        },
        letterText: {
          fontSize: letterFont,
          fontFamily: SOFRA_WHEEL_FONT_FAMILY,
          color: SOFRA_LETTER_COLOR,
          textAlign: 'center',
          includeFontPadding: false,
          lineHeight: Math.round(letterFont * 1.02),
        },
        letterTextSelected: { color: colors.accent },
        shuffleCenter: {
          position: 'absolute',
          zIndex: 30,
          left: wheelCenter - shuffleBtnSize / 2,
          top: wheelCenter - shuffleBtnSize / 2,
          width: shuffleBtnSize,
          height: shuffleBtnSize,
          borderRadius: shuffleBtnSize / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          borderWidth: 1.5,
          borderColor: SOFRA_GLASS_BORDER,
          ...(Platform.OS === 'android' ? { elevation: 18 } : null),
        },
      }),
    [colors, diameter, letterFont, letterHit, previewFont, ringDiameter, ringInset, shuffleBtnSize, wheelCenter],
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
      <View style={[styles.previewWrap, currentWord ? styles.previewWrapActive : null]}>
        {currentWord ? (
          <View style={styles.previewPill}>
            <Text style={styles.previewText}>{currentWord}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.wheelStage}>
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
                    style={[styles.letterAnchor, { left: c.x, top: c.y }]}>
                    <Text style={[styles.letterText, selected ? styles.letterTextSelected : null]}>
                      {wheel[wheelIndex]}
                    </Text>
                  </View>
                );
              })
            : null}
        </View>

        <Pressable
          style={styles.shuffleCenter}
          onPress={handleShufflePress}
          disabled={disabled}
          hitSlop={SHUFFLE_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Karıştır"
          collapsable={false}>
          <Ionicons name="sync" size={shuffleIconSize} color={SOFRA_LETTER_COLOR} />
        </Pressable>
      </View>
    </View>
  );
});
