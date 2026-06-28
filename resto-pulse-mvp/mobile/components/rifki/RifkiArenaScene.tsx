import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  RIFKI_ENEMY_EMOJI,
  RIFKI_STONE,
  RIFKI_TUNNEL_STONES,
  RIFKI_WOOD,
} from '@/constants/rifki';
import { RIFKI_ANIM } from '@/constants/rifki-anim';

import {
  arenaVisibleStoneCount,
  isMaterialRelief,
  materialPressureRatio,
  MATERIAL_VOLUME_MAX,
} from '@/lib/rifki/stoneEngine';

import { RifkiCharacter } from './RifkiCharacter';

type RifkiArenaSceneProps = {
  enemyPosition: number;
  enemyType: 'YILAN' | 'CIYAN';
  enemyVisible: boolean;
  enemyDying: boolean;
  pushToken: number;
  spawnToken: number;
  drainToken: number;
  materialVolume: number;
  mood: 'idle' | 'scared' | 'sad' | 'happy';
  width: number;
};

function stoneColor(index: number): string {
  const palette = [RIFKI_STONE.light, RIFKI_STONE.mid, RIFKI_STONE.dark];
  return palette[index % palette.length] ?? RIFKI_STONE.mid;
}

export function RifkiArenaScene({
  enemyPosition,
  enemyType,
  enemyVisible,
  enemyDying,
  pushToken,
  spawnToken,
  drainToken,
  materialVolume,
  mood,
  width,
}: RifkiArenaSceneProps) {
  const sceneHeight = Math.max(148, Math.round(width * 0.42));
  const tunnelWidth = width * 0.68;
  const alcoveWidth = width - tunnelWidth - 8;

  const materialRatio = materialPressureRatio(materialVolume);
  const enemyRatio = enemyVisible && !enemyDying ? (7 - enemyPosition) / 7 : 0;
  const pressure = Math.min(1, materialRatio * 0.72 + enemyRatio * 0.28);
  const relieved = isMaterialRelief(materialVolume);

  const visibleStoneCount = useMemo(
    () => arenaVisibleStoneCount(materialVolume),
    [materialVolume],
  );

  const doorShift = useSharedValue(0);
  const waveShift = useSharedValue(0);
  const chuteOpacity = useSharedValue(0.6);
  const enemyOpacity = useSharedValue(enemyVisible ? 1 : 0);
  const enemyScale = useSharedValue(1);

  useEffect(() => {
    doorShift.value = withTiming(pressure * 14, { duration: RIFKI_ANIM.enemyMoveMs });
    waveShift.value = withTiming(pressure * (tunnelWidth * 0.38), { duration: RIFKI_ANIM.enemyMoveMs });
    chuteOpacity.value = withTiming(0.45 + materialRatio * 0.55, { duration: RIFKI_ANIM.enemyMoveMs });
  }, [chuteOpacity, doorShift, materialRatio, pressure, tunnelWidth, waveShift]);

  useEffect(() => {
    if (!enemyVisible || enemyDying) return;
    waveShift.value = 48;
    waveShift.value = withTiming(pressure * (tunnelWidth * 0.38), { duration: RIFKI_ANIM.enemySpawnMs });
    enemyOpacity.value = withTiming(1, { duration: RIFKI_ANIM.enemySpawnMs });
  }, [enemyDying, enemyOpacity, enemyVisible, pressure, spawnToken, tunnelWidth, waveShift]);

  useEffect(() => {
    if (pushToken <= 0) return;
    const targetWave = pressure * (tunnelWidth * 0.38);
    const targetDoor = pressure * 14;
    waveShift.value = withSequence(
      withSpring(targetWave - 26, { damping: 8, stiffness: 220 }),
      withSpring(targetWave, { damping: 12, stiffness: 200 }),
    );
    doorShift.value = withSequence(
      withSpring(targetDoor - 8, { damping: 8, stiffness: 220 }),
      withSpring(targetDoor, { damping: 12, stiffness: 200 }),
    );
  }, [doorShift, pressure, pushToken, tunnelWidth, waveShift]);

  useEffect(() => {
    if (drainToken <= 0) return;
    chuteOpacity.value = withSequence(
      withTiming(1, { duration: 120 }),
      withTiming(0.45 + materialRatio * 0.55, { duration: 280 }),
    );
    waveShift.value = withSequence(
      withSpring(pressure * (tunnelWidth * 0.38) - 18, { damping: 10, stiffness: 240 }),
      withSpring(pressure * (tunnelWidth * 0.38), { damping: 14, stiffness: 200 }),
    );
  }, [chuteOpacity, drainToken, materialRatio, pressure, tunnelWidth, waveShift]);

  useEffect(() => {
    if (!enemyDying) return;
    enemyScale.value = withTiming(0, { duration: RIFKI_ANIM.enemyDeathMs });
    enemyOpacity.value = withTiming(0, { duration: RIFKI_ANIM.enemyDeathMs });
  }, [enemyDying, enemyOpacity, enemyScale]);

  const waveStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: waveShift.value }],
  }));

  const doorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -doorShift.value }],
  }));

  const chuteStyle = useAnimatedStyle(() => ({
    opacity: chuteOpacity.value,
  }));

  const enemyStyle = useAnimatedStyle(() => ({
    opacity: enemyOpacity.value,
    transform: [{ scale: enemyScale.value }],
  }));

  const dangerLevel = enemyVisible ? enemyPosition : 7;
  const displayMood = relieved && mood !== 'sad' && mood !== 'happy' ? 'happy' : mood;

  const captionText = relieved
    ? 'Rıfkı rahladı!'
    : materialRatio >= 0.75
      ? 'Taşlar geliyor!'
      : materialRatio >= 0.4
        ? 'Eşleştir — malzeme aksın'
        : 'Rıfkı\'yı kurtar';

  return (
    <View style={[styles.frame, { width, height: sceneHeight, borderColor: RIFKI_WOOD.plankDark }]}>
      <View style={styles.frameInner}>
        {/* Sol: taş tüneli */}
        <View style={[styles.tunnel, { width: tunnelWidth }]}>
          <View style={styles.tunnelRimTop} />
          <View style={styles.tunnelRimBottom} />

          <Animated.View style={[styles.stoneWave, waveStyle]}>
            {RIFKI_TUNNEL_STONES.slice(0, visibleStoneCount).map((stone, index) => (
              <View
                key={`stone-${index}`}
                style={[
                  styles.pebble,
                  {
                    left: stone.x * tunnelWidth,
                    top: stone.y * (sceneHeight - 28),
                    width: stone.r * 2,
                    height: stone.r * 2,
                    borderRadius: stone.r,
                    backgroundColor: stoneColor(index),
                  },
                ]}
              />
            ))}

            {enemyVisible && !enemyDying ? (
              <Animated.View
                style={[
                  styles.enemyBadge,
                  enemyStyle,
                  { left: Math.max(8, visibleStoneCount * 4.2), top: sceneHeight * 0.28 },
                ]}>
                <Text style={styles.enemyEmoji}>{RIFKI_ENEMY_EMOJI[enemyType]}</Text>
              </Animated.View>
            ) : null}
          </Animated.View>

          <Animated.View style={[styles.tunnelChute, chuteStyle]} />
          <View style={styles.tunnelFadeLeft} />
        </View>

        {/* Sağ: Rıfkı + kapı + dikenler */}
        <View style={[styles.alcove, { width: alcoveWidth }]}>
          <View style={styles.spikeWall}>
            {Array.from({ length: 5 }, (_, i) => (
              <View key={`spike-${i}`} style={styles.spike} />
            ))}
          </View>

          <Animated.View style={[styles.woodDoor, doorStyle]}>
            <View style={styles.doorPlank} />
            <View style={[styles.doorPlank, styles.doorPlankMid]} />
            <View style={styles.doorHandle} />
          </Animated.View>

          <View style={styles.characterSlot}>
            <RifkiCharacter dangerLevel={dangerLevel} mood={displayMood} />
          </View>
        </View>
      </View>

      <View style={styles.sceneCaption}>
        <Text style={styles.captionText}>{captionText}</Text>
        <Text style={styles.captionMeta}>
          {materialVolume}/{MATERIAL_VOLUME_MAX}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 3,
    borderRadius: 16,
    backgroundColor: RIFKI_WOOD.frameDark,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  frameInner: {
    flex: 1,
    flexDirection: 'row',
    padding: 4,
    gap: 4,
  },
  tunnel: {
    borderRadius: 12,
    backgroundColor: RIFKI_WOOD.tunnel,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: RIFKI_WOOD.plankDark,
  },
  tunnelRimTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: RIFKI_WOOD.plankDark,
    opacity: 0.85,
  },
  tunnelRimBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: RIFKI_WOOD.plankDark,
    opacity: 0.9,
  },
  tunnelChute: {
    position: 'absolute',
    right: -4,
    bottom: 8,
    width: 22,
    height: 36,
    borderBottomRightRadius: 10,
    borderTopRightRadius: 4,
    backgroundColor: RIFKI_STONE.mid,
    borderWidth: 1,
    borderColor: RIFKI_STONE.dark,
  },
  tunnelFadeLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 18,
    backgroundColor: RIFKI_WOOD.tunnelInner,
    opacity: 0.35,
  },
  stoneWave: {
    ...StyleSheet.absoluteFillObject,
  },
  pebble: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
  },
  enemyBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  enemyEmoji: {
    fontSize: 22,
  },
  alcove: {
    borderRadius: 12,
    backgroundColor: RIFKI_WOOD.tunnelInner,
    borderWidth: 2,
    borderColor: RIFKI_WOOD.plankDark,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  spikeWall: {
    position: 'absolute',
    top: 8,
    right: 6,
    flexDirection: 'row',
    gap: 3,
    zIndex: 0,
  },
  spike: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 18,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#9CA3AF',
  },
  woodDoor: {
    position: 'absolute',
    left: 0,
    top: '18%',
    bottom: '12%',
    width: 14,
    zIndex: 2,
    justifyContent: 'center',
    gap: 2,
  },
  doorPlank: {
    flex: 1,
    backgroundColor: RIFKI_WOOD.plankMid,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: RIFKI_WOOD.plankDark,
  },
  doorPlankMid: {
    backgroundColor: RIFKI_WOOD.plank,
  },
  doorHandle: {
    position: 'absolute',
    right: -3,
    top: '45%',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: RIFKI_WOOD.plankLight,
  },
  characterSlot: {
    zIndex: 1,
    paddingBottom: 6,
    transform: [{ scale: 0.92 }],
  },
  sceneCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: RIFKI_WOOD.frame,
  },
  captionText: {
    fontSize: 11,
    fontWeight: '800',
    color: RIFKI_WOOD.plankLight,
    letterSpacing: 0.3,
  },
  captionMeta: {
    fontSize: 10,
    fontWeight: '700',
    color: RIFKI_STONE.light,
  },
});
