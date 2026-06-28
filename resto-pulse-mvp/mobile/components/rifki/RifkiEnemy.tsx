import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { RIFKI_ANIM } from '@/constants/rifki-anim';
import { RIFKI_ENEMY_EMOJI } from '@/constants/rifki';

type RifkiEnemyProps = {
  position: number;
  type: 'YILAN' | 'CIYAN';
  visible: boolean;
  spawnToken: number;
  pushToken: number;
  dying: boolean;
};

const DOT_STEP = 12;

export function RifkiEnemy({ position, type, visible, spawnToken, pushToken, dying }: RifkiEnemyProps) {
  const translateX = useSharedValue(48);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  const pushX = useSharedValue(0);

  const targetX = useMemo(() => (7 - Math.min(7, Math.max(0, position))) * DOT_STEP, [position]);

  useEffect(() => {
    if (!visible || dying) return;
    translateX.value = 48;
    opacity.value = 0;
    scale.value = 1;
    opacity.value = withTiming(1, { duration: RIFKI_ANIM.enemySpawnMs });
    translateX.value = withTiming(targetX, { duration: RIFKI_ANIM.enemySpawnMs });
  }, [spawnToken, visible, dying, opacity, scale, targetX, translateX]);

  useEffect(() => {
    if (!visible || dying) return;
    translateX.value = withTiming(targetX, { duration: RIFKI_ANIM.enemyMoveMs });
  }, [position, targetX, translateX, visible, dying]);

  useEffect(() => {
    if (!visible || pushToken <= 0) return;
    pushX.value = 18;
    pushX.value = withSpring(0, { damping: 8, stiffness: 220 });
  }, [pushToken, pushX, visible]);

  useEffect(() => {
    if (!dying) return;
    scale.value = withTiming(0, { duration: RIFKI_ANIM.enemyDeathMs });
    opacity.value = withTiming(0, { duration: RIFKI_ANIM.enemyDeathMs });
  }, [dying, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value + pushX.value }, { scale: scale.value }],
  }));

  if (!visible && !dying) return null;
  if (position >= 8 && !dying) return null;

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.enemyRow, animatedStyle]}>
        <Text style={styles.emoji}>{RIFKI_ENEMY_EMOJI[type]}</Text>
      </Animated.View>
      <View style={styles.track}>
        {Array.from({ length: 8 }, (_, idx) => {
          const markerPos = 7 - idx;
          const active = markerPos === position;
          return (
            <View
              key={markerPos}
              style={[styles.dot, active ? styles.dotActive : null, markerPos <= 2 ? styles.dotDanger : null]}
            />
          );
        })}
      </View>
      <Text style={styles.label}>{type === 'YILAN' ? 'Yılan' : 'Akrep'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  enemyRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 30,
  },
  track: {
    flexDirection: 'row-reverse',
    gap: 4,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  dotActive: {
    backgroundColor: '#FFB347',
    transform: [{ scale: 1.25 }],
  },
  dotDanger: {
    backgroundColor: 'rgba(248,113,113,0.35)',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F87171',
  },
});
