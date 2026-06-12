import { useEffect } from 'react';
import { StyleSheet, Text, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { GastroColors } from '@/constants/theme';

type Props = {
  text: string;
  layout: ViewStyle;
  index: number;
};

export function FloatingExampleChip({ text, layout, index }: Props) {
  const drift = useSharedValue(0);
  const sway = useSharedValue(0);

  useEffect(() => {
    const yDur = 3400 + index * 420;
    const xDur = 4100 + index * 360;

    drift.value = withRepeat(
      withTiming(1, { duration: yDur, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    sway.value = withRepeat(
      withTiming(1, { duration: xDur, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );

    return () => {
      cancelAnimation(drift);
      cancelAnimation(sway);
    };
  }, [drift, index, sway]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: (drift.value - 0.5) * 10 },
      { translateX: (sway.value - 0.5) * 7 },
    ],
  }));

  return (
    <Animated.View style={[styles.chip, layout, animatedStyle]} pointerEvents="none">
      <Text style={styles.text}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    position: 'absolute',
    maxWidth: 152,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.28)',
    backgroundColor: 'rgba(30,30,30,0.78)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  text: {
    color: GastroColors.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
