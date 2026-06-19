import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { GastroColors } from '@/constants/theme';

const LOGO = require('@/assets/logo.png');

const BG = '#141414';
const LOGO_SIZE = 92;
const ARM_LEN = 52;

/** Hedef toplam süre ~2.85 sn (3 sn altı) */
const T = {
  run: 760,
  bob: 95,
  brakeUp: 100,
  brakeDown: 180,
  text: 400,
  armsDelay: 120,
  arms: 320,
  pauseBeforeLunge: 160,
  lungeOut: 200,
  lungeHold: 50,
  lungeBack: 280,
  pauseBeforeFade: 280,
  fade: 420,
} as const;
const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);
const EASE_IN_OUT = Easing.bezier(0.45, 0, 0.55, 1);
const EASE_SOFT = Easing.inOut(Easing.cubic);

type Props = {
  onFinish: () => void;
  style?: StyleProp<ViewStyle>;
};

export function GastroAnimatedSplash({ onFinish, style }: Props) {
  const { width, height } = useMemo(() => Dimensions.get('window'), []);
  const centerY = height * 0.44;

  const screenOpacity = useRef(new Animated.Value(1)).current;
  const logoX = useRef(new Animated.Value(-width * 0.55)).current;
  const logoScale = useRef(new Animated.Value(0.18)).current;
  const logoBob = useRef(new Animated.Value(0)).current;
  const logoDodge = useRef(new Animated.Value(0)).current;

  const armsOpacity = useRef(new Animated.Value(0)).current;
  const armsScale = useRef(new Animated.Value(0.72)).current;
  const leftArmRotate = useRef(new Animated.Value(118)).current;
  const rightArmRotate = useRef(new Animated.Value(-118)).current;
  const lunge = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    const runBobs = Animated.sequence(
      Array.from({ length: 3 }, () =>
        Animated.sequence([
          Animated.timing(logoBob, {
            toValue: -6,
            duration: T.bob,
            easing: EASE_IN_OUT,
            useNativeDriver: true,
          }),
          Animated.timing(logoBob, {
            toValue: 0,
            duration: T.bob,
            easing: EASE_IN_OUT,
            useNativeDriver: true,
          }),
        ]),
      ),
    );

    const runIn = Animated.parallel([
      Animated.timing(logoX, {
        toValue: 0,
        duration: T.run,
        easing: EASE_OUT,
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: T.run,
        easing: EASE_OUT,
        useNativeDriver: true,
      }),
      runBobs,
    ]);

    const brake = Animated.sequence([
      Animated.timing(logoScale, {
        toValue: 1.03,
        duration: T.brakeUp,
        easing: EASE_SOFT,
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: T.brakeDown,
        easing: EASE_OUT,
        useNativeDriver: true,
      }),
    ]);

    const textReveal = Animated.parallel([
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: T.text,
        easing: EASE_OUT,
        useNativeDriver: true,
      }),
      Animated.timing(textTranslateY, {
        toValue: 0,
        duration: T.text,
        easing: EASE_OUT,
        useNativeDriver: true,
      }),
    ]);

    const armsPop = Animated.parallel([
      Animated.timing(armsOpacity, {
        toValue: 1,
        duration: T.arms,
        easing: EASE_OUT,
        useNativeDriver: true,
      }),
      Animated.timing(armsScale, {
        toValue: 1,
        duration: T.arms,
        easing: EASE_OUT,
        useNativeDriver: true,
      }),
      Animated.timing(leftArmRotate, {
        toValue: 28,
        duration: T.arms,
        easing: EASE_OUT,
        useNativeDriver: true,
      }),
      Animated.timing(rightArmRotate, {
        toValue: -28,
        duration: T.arms,
        easing: EASE_OUT,
        useNativeDriver: true,
      }),
    ]);

    const yalanma = Animated.sequence([
      Animated.parallel([
        Animated.timing(lunge, {
          toValue: 1,
          duration: T.lungeOut,
          easing: EASE_SOFT,
          useNativeDriver: true,
        }),
        Animated.timing(logoDodge, {
          toValue: 1,
          duration: T.lungeOut,
          easing: EASE_SOFT,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(T.lungeHold),
      Animated.parallel([
        Animated.timing(lunge, {
          toValue: 0,
          duration: T.lungeBack,
          easing: EASE_IN_OUT,
          useNativeDriver: true,
        }),
        Animated.timing(logoDodge, {
          toValue: 0,
          duration: T.lungeBack,
          easing: EASE_IN_OUT,
          useNativeDriver: true,
        }),
      ]),
    ]);

    const fadeOut = Animated.timing(screenOpacity, {
      toValue: 0,
      duration: T.fade,
      easing: EASE_IN_OUT,
      useNativeDriver: true,
    });

    const master = Animated.sequence([
      runIn,
      brake,
      Animated.parallel([
        textReveal,
        Animated.sequence([Animated.delay(T.armsDelay), armsPop]),
      ]),
      Animated.delay(T.pauseBeforeLunge),
      yalanma,
      Animated.delay(T.pauseBeforeFade),
      fadeOut,
    ]);

    master.start(({ finished }) => {
      if (finished) {
        onFinish();
      }
    });

    return () => {
      master.stop();
      screenOpacity.stopAnimation();
      logoX.stopAnimation();
      logoScale.stopAnimation();
      logoBob.stopAnimation();
      logoDodge.stopAnimation();
      armsOpacity.stopAnimation();
      armsScale.stopAnimation();
      leftArmRotate.stopAnimation();
      rightArmRotate.stopAnimation();
      lunge.stopAnimation();
      textOpacity.stopAnimation();
      textTranslateY.stopAnimation();
    };
  }, [
    armsOpacity,
    armsScale,
    leftArmRotate,
    logoBob,
    logoDodge,
    logoScale,
    logoX,
    lunge,
    onFinish,
    rightArmRotate,
    screenOpacity,
    textOpacity,
    textTranslateY,
  ]);

  const leftLungeX = lunge.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 28],
  });
  const rightLungeX = lunge.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -28],
  });
  const dodgeScale = logoDodge.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.94],
  });
  const dodgeY = logoDodge.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const leftRotate = leftArmRotate.interpolate({
    inputRange: [-180, 180],
    outputRange: ['-180deg', '180deg'],
  });
  const rightRotate = rightArmRotate.interpolate({
    inputRange: [-180, 180],
    outputRange: ['-180deg', '180deg'],
  });

  return (
    <View style={[styles.root, { width, height }, style]}>
      <StatusBar hidden />
      <View style={styles.backdrop} />

      <Animated.View style={[styles.content, { opacity: screenOpacity }]} pointerEvents="none">
        <View style={[styles.stage, { top: centerY - LOGO_SIZE / 2, width }]}>
          <Animated.View
            style={[
              styles.hero,
              {
                transform: [
                  { translateX: logoX },
                  { translateY: Animated.add(logoBob, dodgeY) },
                  { scale: Animated.multiply(logoScale, dodgeScale) },
                ],
              },
            ]}>
            <View style={styles.logoCluster}>
              <Animated.View
                style={[
                  styles.armsLayer,
                  {
                    opacity: armsOpacity,
                    transform: [{ scale: armsScale }],
                  },
                ]}>
                <Animated.View
                  style={[
                    styles.armWrap,
                    styles.armLeft,
                    {
                      transform: [{ rotate: leftRotate }, { translateX: leftLungeX }],
                    },
                  ]}>
                  <View style={styles.sleeve} />
                  <View style={styles.hand}>
                    <MaterialCommunityIcons name="silverware-fork" size={22} color={GastroColors.gold} />
                  </View>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.armWrap,
                    styles.armRight,
                    {
                      transform: [{ rotate: rightRotate }, { translateX: rightLungeX }],
                    },
                  ]}>
                  <View style={styles.sleeve} />
                  <View style={styles.hand}>
                    <MaterialCommunityIcons name="knife" size={22} color={GastroColors.gold} />
                  </View>
                </Animated.View>
              </Animated.View>

              <Image source={LOGO} style={styles.logo} contentFit="contain" />
            </View>

            <Animated.View
              style={[
                styles.copy,
                {
                  opacity: textOpacity,
                  transform: [{ translateY: textTranslateY }],
                },
              ]}>
              <Text style={styles.wordmark}>
                Gastro<Text style={styles.accent}>Skor</Text>
              </Text>
              <Text style={styles.tagline}>Tek Tıkla Gastro</Text>
            </Animated.View>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: BG,
    overflow: 'hidden',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG,
  },
  content: {
    ...StyleSheet.absoluteFillObject,
  },
  stage: {
    position: 'absolute',
    left: 0,
    alignItems: 'center',
  },
  hero: {
    alignItems: 'center',
  },
  logoCluster: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    marginTop: 10,
    alignItems: 'center',
    gap: 2,
    minWidth: 180,
  },
  wordmark: {
    color: GastroColors.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  accent: {
    color: GastroColors.accent,
  },
  tagline: {
    color: GastroColors.muted,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  armsLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  armWrap: {
    position: 'absolute',
    width: ARM_LEN + 28,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
  },
  armLeft: {
    left: -ARM_LEN + 8,
    top: LOGO_SIZE / 2 - 12,
  },
  armRight: {
    right: -ARM_LEN + 8,
    top: LOGO_SIZE / 2 - 12,
    flexDirection: 'row-reverse',
  },
  sleeve: {
    width: ARM_LEN,
    height: 14,
    borderRadius: 7,
    backgroundColor: GastroColors.accent,
  },
  hand: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: GastroColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: GastroColors.accentHover,
  },
});
