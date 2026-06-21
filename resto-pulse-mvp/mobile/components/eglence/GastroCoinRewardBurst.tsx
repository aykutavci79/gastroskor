import { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, Image, Modal, StyleSheet, View } from 'react-native';

const COIN = require('@/assets/gastro-hub/designs/gastrocoin-wallet-coin-transparent.png');

type Origin = { x: number; y: number };

type ParticleSpec = {
  dx: number;
  dy: number;
  rot: string;
  delay: number;
  size: number;
};

/** Butondan sağa/sola saçılan Çatal G parçacıkları. */
const BURST_SPECS: ParticleSpec[] = [
  { dx: -92, dy: -24, rot: '-16deg', delay: 0, size: 24 },
  { dx: -58, dy: 10, rot: '12deg', delay: 35, size: 20 },
  { dx: -118, dy: 2, rot: '-8deg', delay: 55, size: 18 },
  { dx: -74, dy: -36, rot: '-22deg', delay: 20, size: 16 },
  { dx: 94, dy: -22, rot: '18deg', delay: 0, size: 24 },
  { dx: 60, dy: 12, rot: '-14deg', delay: 40, size: 20 },
  { dx: 112, dy: 0, rot: '10deg', delay: 60, size: 18 },
  { dx: 78, dy: -34, rot: '20deg', delay: 25, size: 16 },
];

type ParticleProps = {
  origin: Origin;
  spec: ParticleSpec;
  onFinish: () => void;
};

function BurstParticle({ origin, spec, onFinish }: ParticleProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 820,
      delay: spec.delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) onFinishRef.current();
    });
    return () => anim.stop();
  }, [progress, spec.delay]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, spec.dx],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, spec.dy],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.12, 0.75, 1],
    outputRange: [0, 1, 0.85, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.18, 1],
    outputRange: [0.3, 1, 0.5],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          left: origin.x - spec.size / 2,
          top: origin.y - spec.size / 2,
          width: spec.size,
          height: spec.size,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }, { rotate: spec.rot }],
        },
      ]}>
      <Image source={COIN} style={{ width: spec.size, height: spec.size }} resizeMode="contain" />
    </Animated.View>
  );
}

type BurstProps = {
  origin: Origin;
  onComplete: () => void;
};

function GastroCoinRewardBurst({ origin, onComplete }: BurstProps) {
  const finished = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const onParticleFinish = useCallback(() => {
    finished.current += 1;
    if (finished.current >= BURST_SPECS.length) onCompleteRef.current();
  }, []);

  return (
    <>
      {BURST_SPECS.map((spec, index) => (
        <BurstParticle key={index} origin={origin} spec={spec} onFinish={onParticleFinish} />
      ))}
    </>
  );
}

type ModalProps = {
  origin: Origin | null;
  onComplete: () => void;
};

/** Tam ekran overlay — ScrollView kirpmasi olmadan coin saçilimi. */
export function GastroCoinRewardBurstModal({ origin, onComplete }: ModalProps) {
  return (
    <Modal visible={origin != null} transparent animationType="none" statusBarTranslucent pointerEvents="none">
      <View style={styles.overlay} pointerEvents="none">
        {origin ? <GastroCoinRewardBurst origin={origin} onComplete={onComplete} /> : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: 'absolute',
  },
});
