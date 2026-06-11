import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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

const BANNER_HEIGHT = 148;
const AUTO_SCROLL_MS = 5200;
const FADE_MS = 1400;
const SCREEN_H_PAD = 16;

const BANNER_SLIDES = ONLINE_ORDER_CATEGORIES.map((cat) => ({
  slug: cat.slug,
  source: LOCAL_KITCHEN_IMAGES[cat.slug],
})).filter((row) => row.source != null);

export function OnlineOrderEntryBanner() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const bannerWidth = screenWidth - SCREEN_H_PAD * 2;
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
    void listOnlineOrderRestaurants({ city: 'Bursa', limit: 50, min_rating: ONLINE_ORDER_MIN_RATING })
      .then((res) => setOpenCount(res.items.length))
      .catch(() => setOpenCount(null));
  }, []);

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
        { width: bannerWidth, height: BANNER_HEIGHT },
        pressed && styles.pressed,
      ]}
      onPress={() => router.push('/siparis-acik' as never)}
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

      <View style={styles.content} pointerEvents="none">
        <View style={styles.textBlock}>
          <View style={styles.titlePill}>
            <Text style={styles.main}>Online Sipariş</Text>
          </View>
          <Text style={styles.sub}>
            Tek Tıkla <Text style={styles.accent}>Liste</Text>
          </Text>
          <Text style={styles.hint}>{countLine}</Text>
        </View>

        <View style={styles.chevronBox}>
          <View style={styles.iconCircle}>
            <Ionicons name="bag-handle" size={22} color={GastroColors.gold} />
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" style={styles.chevron} />
        </View>
      </View>

      <View style={styles.borderGlow} pointerEvents="none" />
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
  textBlock: { flex: 1, gap: 6 },
  titlePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,107,53,0.94)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  main: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  sub: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    ...textShadow,
  },
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
  chevron: {
    ...textShadow,
  },
  borderGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,107,53,0.5)',
  },
});
