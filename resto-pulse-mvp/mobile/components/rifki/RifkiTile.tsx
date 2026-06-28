import { memo, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { GastroCoinMark } from '@/components/eglence/GastroCoinMark';
import { RIFKI_ANIM } from '@/constants/rifki-anim';
import { RIFKI_STONE, RIFKI_TILE_EMOJI } from '@/constants/rifki';
import type { TileAnimHint } from '@/lib/rifki/gridAnimHelpers';
import { isStoneTile, type Tile } from '@/lib/rifki/matchEngine';

import { RifkiStonePebble, RifkiWoodPlank } from './RifkiWoodPlank';

const TILE_GAP = 2;

type RifkiTileProps = {
  tile: Tile;
  size: number;
  onPress: (row: number, col: number) => void;
  isSelected: boolean;
  disabled?: boolean;
  accentSoft: string;
  animHint?: TileAnimHint;
};

export const RifkiTile = memo(function RifkiTile({
  tile,
  size,
  onPress,
  isSelected,
  disabled = false,
  accentSoft,
  animHint,
}: RifkiTileProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const selectScale = useSharedValue(1);

  useEffect(() => {
    selectScale.value = withTiming(isSelected ? 1.06 : 1, { duration: 90 });
  }, [isSelected, selectScale]);

  useEffect(() => {
    const kind = animHint?.kind ?? 'idle';

    if (kind === 'match') {
      scale.value = withTiming(0, { duration: RIFKI_ANIM.matchMs });
      opacity.value = withTiming(0, { duration: RIFKI_ANIM.matchMs });
      return;
    }

    if (kind === 'fall' || kind === 'stoneFall') {
      const rows = animHint?.fallOffsetRows ?? (kind === 'stoneFall' ? 3 : 1);
      translateY.value = -rows * (size + TILE_GAP);
      translateY.value = withSpring(0, { damping: kind === 'stoneFall' ? 12 : 14, stiffness: kind === 'stoneFall' ? 150 : 170 });
      scale.value = 1;
      opacity.value = 1;
      return;
    }

    if (kind === 'appear') {
      scale.value = 0;
      opacity.value = 0;
      scale.value = withTiming(1, { duration: RIFKI_ANIM.appearMs });
      opacity.value = withTiming(1, { duration: RIFKI_ANIM.appearMs });
      translateY.value = 0;
      translateX.value = 0;
      return;
    }

    if (kind === 'shake') {
      translateX.value = withSequence(
        withTiming(-7, { duration: 50 }),
        withTiming(7, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
      return;
    }

    scale.value = withTiming(1, { duration: 80 });
    opacity.value = withTiming(1, { duration: 80 });
    translateY.value = withTiming(0, { duration: 80 });
    translateX.value = withTiming(0, { duration: 80 });
  }, [animHint, opacity, scale, size, translateX, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value * selectScale.value },
    ],
  }));

  const isPower = tile.power === 'GC_TEK' || tile.power === 'GC_CIFT';
  const isStone = isStoneTile(tile);
  const gemSize = Math.max(18, size * 0.58);

  return (
    <Pressable disabled={disabled || isStone} onPress={() => onPress(tile.row, tile.col)}>
      <Animated.View style={[{ width: size, height: size }, animatedStyle]}>
        <RifkiWoodPlank
          width={size}
          height={size}
          selected={isSelected}
          accentSoft={accentSoft}
          isPower={isPower}
          isStone={isStone}
        />
        <View style={styles.content} pointerEvents="none">
          {isStone ? (
            <View style={styles.stoneCluster}>
              <RifkiStonePebble size={size * 0.55} variant={0} />
              <View style={[styles.stoneSecondary, { right: size * 0.08, bottom: size * 0.06 }]}>
                <RifkiStonePebble size={size * 0.38} variant={1} />
              </View>
            </View>
          ) : isPower ? (
            <View style={styles.powerWrap}>
              <GastroCoinMark variant="wallet-coin" size={Math.max(18, size * 0.55)} />
              {tile.power === 'GC_CIFT' ? (
                <View style={styles.secondCoin}>
                  <GastroCoinMark variant="wallet-coin" size={Math.max(14, size * 0.42)} />
                </View>
              ) : null}
            </View>
          ) : (
            <Text
              style={[
                styles.gem,
                {
                  fontSize: gemSize,
                  textShadowColor: 'rgba(0,0,0,0.35)',
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 2,
                },
              ]}>
              {RIFKI_TILE_EMOJI[tile.color]}
            </Text>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  content: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gem: {
    textAlign: 'center',
  },
  stoneCluster: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stoneSecondary: {
    position: 'absolute',
  },
  powerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondCoin: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    opacity: 0.95,
  },
});
