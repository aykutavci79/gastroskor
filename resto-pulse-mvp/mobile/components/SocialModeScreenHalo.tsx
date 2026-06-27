import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const GOLD = '#FFB703';
const GOLD_SOFT = 'rgba(255, 183, 3, 0.72)';

type Props = {
  active: boolean;
  /** Tarama devam ederken kenar cizgisi hafif nabiz */
  intensify?: boolean;
};

export function SocialModeScreenHalo({ active, intensify = false }: Props) {
  const pulse = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    if (!active) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }

    const duration = intensify ? 700 : 1100;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.82,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, intensify, pulse]);

  if (!active) return null;

  return (
    <View style={styles.host} pointerEvents="none">
      <Animated.View
        style={[
          styles.frame,
          styles.frameOuter,
          {
            opacity: pulse,
            borderColor: GOLD_SOFT,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.frame,
          styles.frameInner,
          {
            opacity: pulse,
            borderColor: GOLD,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  frame: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  frameOuter: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
  },
  frameInner: {
    top: 5,
    left: 5,
    right: 5,
    bottom: 5,
    borderWidth: 1.5,
  },
});
