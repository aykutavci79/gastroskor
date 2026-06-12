import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const ACCENT = '#FF6B35';
const MIC_SIZE = 80;
const MIC_ZONE = 200;
const BAR_COUNT = 7;
const BAR_MAX = 44;
const RING_SIZES = [100, 130, 160] as const;
const RING_DELAYS = [0, 500, 1000] as const;
const RIPPLE_DURATION_MS = 2200;
const RIPPLE_END_SCALE = 1.3;

/** short · medium · tall · mid · tall · medium · short */
const BAR_MIN = [10, 18, 30, 14, 32, 20, 12];
const BAR_MAX_H = [24, 36, BAR_MAX, 26, BAR_MAX, 34, 22];
const BAR_SPEED_MS = [420, 560, 380, 640, 480, 520, 450];

type Props = {
  listening?: boolean;
  transcribing?: boolean;
};

export const VOICE_ORB_SIZE = MIC_ZONE + 56;

function RippleRing({ size, delayMs }: { size: number; delayMs: number }) {
  const startScale = MIC_SIZE / size;
  const scale = useRef(new Animated.Value(startScale)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loopRef.current?.stop();
    if (delayRef.current) clearTimeout(delayRef.current);

    scale.setValue(startScale);
    opacity.setValue(0);

    const ripple = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: startScale, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.7, duration: 0, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: RIPPLE_END_SCALE,
            duration: RIPPLE_DURATION_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: RIPPLE_DURATION_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    delayRef.current = setTimeout(() => {
      loopRef.current = ripple;
      ripple.start();
    }, delayMs);

    return () => {
      if (delayRef.current) clearTimeout(delayRef.current);
      ripple.stop();
      loopRef.current = null;
    };
  }, [delayMs, opacity, scale, startScale]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.rippleRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

function WaveBar({ index, active }: { index: number; active: boolean }) {
  const height = useRef(new Animated.Value(BAR_MIN[index])).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    loopRef.current?.stop();

    if (!active) {
      Animated.timing(height, {
        toValue: BAR_MIN[index],
        duration: 320,
        useNativeDriver: false,
      }).start();
      return;
    }

    const wave = Animated.loop(
      Animated.sequence([
        Animated.timing(height, {
          toValue: BAR_MAX_H[index],
          duration: BAR_SPEED_MS[index],
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(height, {
          toValue: BAR_MIN[index],
          duration: BAR_SPEED_MS[index],
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );

    loopRef.current = wave;
    wave.start();

    return () => {
      wave.stop();
      loopRef.current = null;
    };
  }, [active, height, index]);

  return (
    <View style={styles.barSlot}>
      <Animated.View style={[styles.bar, { height }]} />
    </View>
  );
}

export function VoiceListenOrb({ listening = false, transcribing = false }: Props) {
  const active = listening || transcribing;

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.micZone}>
        {RING_SIZES.map((size, index) => (
          <RippleRing key={size} size={size} delayMs={RING_DELAYS[index]} />
        ))}

        <View style={styles.micButton}>
          <Ionicons
            name={transcribing ? 'hourglass-outline' : 'mic'}
            size={32}
            color="#fff"
          />
        </View>
      </View>

      <View style={styles.barsRow}>
        {Array.from({ length: BAR_COUNT }, (_, index) => (
          <WaveBar key={index} index={index} active={active} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 24,
    paddingVertical: 4,
    overflow: 'visible',
  },
  micZone: {
    width: MIC_ZONE,
    height: MIC_ZONE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  rippleRing: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: ACCENT,
    backgroundColor: 'rgba(255,107,53,0.06)',
    zIndex: 1,
  },
  micButton: {
    width: MIC_SIZE,
    height: MIC_SIZE,
    borderRadius: MIC_SIZE / 2,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    elevation: 6,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    height: BAR_MAX,
  },
  barSlot: {
    height: BAR_MAX,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 7,
    borderRadius: 3.5,
    backgroundColor: ACCENT,
  },
});
