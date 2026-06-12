import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { LOCAL_KITCHEN_IMAGES } from '@/constants/kitchen-category-images';
import { ONLINE_ORDER_CATEGORIES } from '@/constants/online-order-categories';
import { ONLINE_ORDER_MIN_RATING } from '@/constants/online-orders';
import { GastroColors } from '@/constants/theme';
import { listOnlineOrderRestaurants } from '@/lib/api';

const BANNER_HEIGHT_FULL = 148;
const BANNER_HEIGHT_VITRIN = 58;
const AUTO_SCROLL_MS = 5200;
const FADE_MS = 1400;
const SCREEN_H_PAD = 16;

const BANNER_SLIDES = ONLINE_ORDER_CATEGORIES.map((cat) => ({
  slug: cat.slug,
  source: LOCAL_KITCHEN_IMAGES[cat.slug],
})).filter((row) => row.source != null);

type Props = {
  /** Keşfet vitrin: kompakt, flex ile büyür */
  variant?: 'full' | 'vitrin';
  style?: import('react-native').ViewStyle;
};

export function OnlineOrderEntryBanner({ variant = 'full', style }: Props) {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const vitrin = variant === 'vitrin';
  const bannerWidth = vitrin ? ('100%' as const) : screenWidth - SCREEN_H_PAD * 2;
  const bannerHeight = vitrin ? undefined : BANNER_HEIGHT_FULL;
  const indexRef = useRef(0);
  const animatingRef = useRef(false);
  const opacityA = useRef(new Animated.Value(1)).current;
  const opacityB = useRef(new Animated.Value(0)).current;
  const [indexA, setIndexA] = useState(0);
  const [indexB, setIndexB] = useState(0);
  const frontIsARef = useRef(true);
  const [openCount, setOpenCount] = useState<number | null>(null);

  const slides = useMemo(() => BANNER_SLIDES, []);

  const refresh = useCallback(() => {
    if (variant === 'vitrin') return;
    void listOnlineOrderRestaurants({ city: 'Bursa', limit: 50, min_rating: ONLINE_ORDER_MIN_RATING })
      .then((res) => setOpenCount(res.items.length))
      .catch(() => setOpenCount(null));
  }, [variant]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const runCrossfade = useCallback(() => {
    if (slides.length <= 1 || animatingRef.current) return;

    const next = (indexRef.current + 1) % slides.length;
    animatingRef.current = true;

    if (frontIsARef.current) {
      setIndexB(next);
      Animated.parallel([
        Animated.timing(opacityA, {
          toValue: 0,
          duration: FADE_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacityB, {
          toValue: 1,
          duration: FADE_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        animatingRef.current = false;
        if (!finished) return;
        indexRef.current = next;
        frontIsARef.current = false;
      });
    } else {
      setIndexA(next);
      Animated.parallel([
        Animated.timing(opacityB, {
          toValue: 0,
          duration: FADE_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacityA, {
          toValue: 1,
          duration: FADE_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        animatingRef.current = false;
        if (!finished) return;
        indexRef.current = next;
        frontIsARef.current = true;
      });
    }
  }, [opacityA, opacityB, slides.length]);

  useEffect(() => {
    indexRef.current = 0;
    frontIsARef.current = true;
    setIndexA(0);
    setIndexB(0);
    opacityA.setValue(1);
    opacityB.setValue(0);
  }, [opacityA, opacityB, slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const timer = setInterval(runCrossfade, AUTO_SCROLL_MS);
    return () => clearInterval(timer);
  }, [runCrossfade, slides.length]);

  const countLine =
    openCount == null
      ? 'Şimdi sipariş alan restoranları gör'
      : openCount === 0
        ? 'Yakında pilot restoranlar burada'
        : `${openCount} restoran şimdi sipariş alıyor`;

  const slideA = slides[indexA];
  const slideB = slides[indexB];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.banner,
        vitrin ? styles.bannerVitrin : null,
        { width: bannerWidth, height: bannerHeight, minHeight: vitrin ? BANNER_HEIGHT_VITRIN : undefined },
        style,
        pressed && styles.pressed,
      ]}
      onPress={() => {
        Keyboard.dismiss();
        router.push('/siparis-acik' as never);
      }}
      accessibilityRole="button"
      accessibilityLabel="Online siparis acik restoranlar">
      <View style={styles.mediaClip} pointerEvents="none">
        {slideA ? (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacityA }]}>
            <Image
              source={slideA.source}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition="center"
              cachePolicy="memory-disk"
            />
          </Animated.View>
        ) : null}
        {slideB ? (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacityB }]}>
            <Image
              source={slideB.source}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition="center"
              cachePolicy="memory-disk"
            />
          </Animated.View>
        ) : null}
      </View>

      <View style={[styles.content, vitrin && styles.contentVitrin]} pointerEvents="none">
        <View style={styles.textBlock}>
          <View style={[styles.titlePill, vitrin && styles.titlePillVitrin]}>
            <Text style={[styles.main, vitrin && styles.mainVitrin]}>Online Sipariş</Text>
          </View>
          <Text style={[styles.sub, vitrin && styles.subVitrin]}>
            {vitrin ? (
              <>
                Tek Tıkla <Text style={styles.accent}>Liste</Text>
              </>
            ) : (
              <>
                Tek Tıkla <Text style={styles.accent}>Liste</Text>
              </>
            )}
          </Text>
          {!vitrin ? <Text style={styles.hint}>{countLine}</Text> : null}
        </View>

        <View style={[styles.chevronBox, vitrin && styles.chevronBoxVitrin]}>
          <View style={[styles.iconCircle, vitrin && styles.iconCircleVitrin]}>
            <Ionicons name="bag-handle" size={vitrin ? 20 : 22} color={GastroColors.gold} />
          </View>
          {!vitrin ? <Ionicons name="chevron-forward" size={20} color="#fff" style={styles.chevron} /> : null}
        </View>
      </View>

      <View style={[styles.borderGlow, vitrin && styles.borderGlowVitrin]} pointerEvents="none" />
    </Pressable>
  );
}

const textShadow = {
  textShadowColor: 'rgba(0,0,0,0.75)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 5,
} as const;

const styles = StyleSheet.create({
  banner: {
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#141414',
  },
  bannerVitrin: {
    alignSelf: 'stretch',
    borderRadius: 11,
    flex: 1,
    minHeight: BANNER_HEIGHT_VITRIN,
  },
  pressed: { opacity: 0.94, transform: [{ scale: 0.995 }] },
  mediaClip: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  contentVitrin: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    gap: 8,
  },
  textBlock: { flex: 1, gap: 6 },
  titlePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,107,53,0.94)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  titlePillVitrin: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  main: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  mainVitrin: { fontSize: 13 },
  sub: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    ...textShadow,
  },
  subVitrin: { fontSize: 17 },
  accent: {
    color: GastroColors.gold,
    fontWeight: '900',
    ...textShadow,
  },
  hint: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    ...textShadow,
  },
  chevronBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  chevronBoxVitrin: { gap: 0 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(14,14,14,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,183,3,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleVitrin: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  chevron: {
    ...textShadow,
  },
  borderGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,107,53,0.5)',
  },
  borderGlowVitrin: {
    borderRadius: 11,
  },
});
