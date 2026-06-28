import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { RIFKI_CHARACTER_EMOJI } from '@/constants/rifki';

type RifkiCharacterProps = {
  dangerLevel: number;
  mood: 'idle' | 'scared' | 'sad' | 'happy';
};

export function RifkiCharacter({ dangerLevel, mood }: RifkiCharacterProps) {
  const rotation = useSharedValue(0);
  const translateY = useSharedValue(0);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(rotation);
    cancelAnimation(translateY);
    cancelAnimation(shakeX);

    if (mood === 'sad') {
      rotation.value = 0;
      translateY.value = 0;
      shakeX.value = 0;
      return;
    }

    if (mood === 'happy') {
      translateY.value = withSequence(
        withTiming(-10, { duration: 160 }),
        withTiming(0, { duration: 180 }),
      );
      return;
    }

    if (mood === 'scared' || dangerLevel <= 2) {
      shakeX.value = withRepeat(
        withSequence(withTiming(-4, { duration: 45 }), withTiming(4, { duration: 45 })),
        -1,
        true,
      );
      return;
    }

    rotation.value = withRepeat(
      withSequence(withTiming(-4, { duration: 900 }), withTiming(4, { duration: 900 })),
      -1,
      true,
    );
  }, [dangerLevel, mood, rotation, shakeX, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shakeX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const label =
    mood === 'sad'
      ? 'Yakalandı!'
      : mood === 'happy'
        ? 'Kurtuldu!'
        : dangerLevel <= 2
          ? 'Tehlike!'
          : 'Rıfkı';

  return (
    <Animated.View style={[styles.wrap, animatedStyle]}>
      <Text style={styles.emoji}>{RIFKI_CHARACTER_EMOJI}</Text>
      <Text style={styles.label}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  emoji: {
    fontSize: 36,
  },
  label: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF7ED',
  },
});
