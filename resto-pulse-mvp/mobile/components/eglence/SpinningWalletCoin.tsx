import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { GastroCoinMark } from '@/components/eglence/GastroCoinMark';

type Props = {
  size: number;
};

/** Hafif Y ekseni salinimi — tam tur yok, alt kirpma ve edge-on gorunum yok. */
export function SpinningWalletCoin({ size }: Props) {
  const wobble = useRef(new Animated.Value(0)).current;
  const renderSize = Math.round(size * 0.96);
  const boxW = Math.round(size * 1.1);
  const boxH = Math.round(size * 1.16);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wobble, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(wobble, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [wobble]);

  const rotateY = wobble.interpolate({
    inputRange: [0, 1],
    outputRange: ['-22deg', '22deg'],
  });

  return (
    <View style={[styles.stage, { width: boxW, height: boxH }]}>
      <Animated.View
        style={[
          styles.coin,
          {
            width: boxW,
            height: boxH,
            transform: [{ perspective: 720 }, { rotateY }],
          },
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
