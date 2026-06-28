import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Animated,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type ViewStyle,
} from 'react-native';

import { KESFET_VITRIN_BANNER, KESFET_VITRIN_TEXT_SHADOW } from '@/constants/kesfet-vitrin-banner';
import { GastroColors } from '@/constants/theme';
import { useCity } from '@/context/city-context';
import { useBannerCrossfade } from '@/hooks/use-banner-crossfade';
import { listRegionalProducts } from '@/lib/api';
import { regionalProductImageSource } from '@/lib/regional-product-image';
import type { RegionalProductItem } from '@/lib/types';

type Slide = {
  name: string;
  source: ImageSourcePropType;
};

type Props = {
  style?: ViewStyle;
};

function buildSlides(items: RegionalProductItem[]): Slide[] {
  const slides: Slide[] = [];
  for (const row of items) {
    const source = regionalProductImageSource(row.slug, row.image_url);
    if (!source) continue;
    slides.push({ name: row.name, source });
  }
  return slides;
}

/** Ana ekran vitrin — seçili ile göre yöresel ürünler (boş ilde de görünür). */
export function RegionalFlavorsEntryBanner({ style }: Props) {
  const { city, cityLabel } = useCity();
  const router = useRouter();
  const [count, setCount] = useState<number | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);

  const refresh = useCallback(() => {
    void listRegionalProducts({ city })
      .then((data) => {
        setCount(data.items.length);
        setSlides(buildSlides(data.items));
      })
      .catch(() => {
        setCount(0);
        setSlides([]);
      });
  }, [city]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const safeSlides = useMemo(() => slides, [slides]);
  const { opacityA, opacityB, indexA, indexB } = useBannerCrossfade(safeSlides.length);

  const countLine =
    count == null
      ? `${cityLabel} · yükleniyor…`
      : count === 0
        ? `${cityLabel} · tescilli ürün listesi yakında`
        : `${cityLabel} · ${count} tescilli ürün`;

  const slideA = safeSlides[indexA];
  const slideB = safeSlides[indexB];

  return (
    <Pressable
      style={({ pressed }) => [styles.banner, style, pressed && styles.pressed]}
      onPress={() => {
        Keyboard.dismiss();
        router.push('/yoresel' as never);
      }}
      accessibilityRole="button"
      accessibilityLabel="Yöresel lezzetler">
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
        ) : (
          <View style={styles.mediaFallback}>
            <Text style={styles.fallbackEmoji}>🏺</Text>
          </View>
        )}
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
        {slideA ? (
          <Animated.View style={[styles.productTag, { opacity: opacityA }]} pointerEvents="none">
            <Text style={styles.productTagText} numberOfLines={1}>
              {slideA.name}
            </Text>
          </Animated.View>
        ) : null}
      </View>

      <View style={styles.content} pointerEvents="none">
        <View style={styles.textBlock}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Yöresel Lezzetler</Text>
          </View>
          <Text style={styles.title}>
            Tek Tıkla <Text style={styles.accent}>Keşfet</Text>
          </Text>
          <Text style={styles.hint}>{countLine}</Text>
        </View>
        <View style={styles.iconCircle}>
          <Ionicons name="ribbon-outline" size={KESFET_VITRIN_BANNER.iconSize} color={GastroColors.gold} />
        </View>
      </View>

      <View style={styles.borderGlow} pointerEvents="none" />
    </Pressable>
  );
}

const textShadow = KESFET_VITRIN_TEXT_SHADOW;

const styles = StyleSheet.create({
  banner: {
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: '#141414',
    minHeight: KESFET_VITRIN_BANNER.minHeight,
    flex: 1,
  },
  pressed: { opacity: 0.94, transform: [{ scale: 0.995 }] },
  mediaClip: { ...StyleSheet.absoluteFillObject },
  mediaFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#2a2018',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackEmoji: { fontSize: 28, opacity: 0.55 },
  content: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 11,
    paddingVertical: 8,
    gap: 8,
  },
  textBlock: { flex: 1, gap: 3 },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    backgroundColor: 'rgba(180,83,9,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    color: '#fff',
    fontSize: KESFET_VITRIN_BANNER.pillFontSize,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  title: {
    color: '#fff',
    fontSize: KESFET_VITRIN_BANNER.titleFontSize,
    fontWeight: '800',
    ...textShadow,
  },
  accent: {
    color: GastroColors.gold,
    fontWeight: '900',
    ...textShadow,
  },
  hint: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: KESFET_VITRIN_BANNER.hintFontSize,
    fontWeight: '700',
    ...textShadow,
  },
  iconCircle: {
    width: KESFET_VITRIN_BANNER.iconCircle,
    height: KESFET_VITRIN_BANNER.iconCircle,
    borderRadius: KESFET_VITRIN_BANNER.iconCircle / 2,
    backgroundColor: 'rgba(14,14,14,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productTag: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    maxWidth: '52%',
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  productTagText: {
    color: '#fff',
    fontSize: KESFET_VITRIN_BANNER.slideTagFontSize,
    fontWeight: '800',
    ...textShadow,
  },
  borderGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.45)',
  },
});
