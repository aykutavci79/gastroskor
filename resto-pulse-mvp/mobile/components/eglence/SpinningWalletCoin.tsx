import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { GastroCoinMark } from '@/components/eglence/GastroCoinMark';

type Props = {
  size: number;
};

/** GC logosu — kendi ekseni etrafında (Y) sürekli dönüş. */
export function SpinningWalletCoin({ size }: Props) {
  const rotation = useSharedValue(0);
  const renderSize = Math.round(size * 0.96);
  const boxW = Math.round(size * 1.1);
  const boxH = Math.round(size * 1.16);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 4200, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(rotation);
  }, [rotation]);

  const coinStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { rotateY: `${rotation.value}deg` }],
  }));

  return (
    <View style={[styles.stage, { width: boxW, height: boxH }]}>
      <Animated.View
        style={[
          styles.coin,
          {
            width: boxW,
            height: boxH,
          },
          coinStyle,
        ]}>
        <GastroCoinMark variant="wallet-coin" size={renderSize} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  coin: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
});
