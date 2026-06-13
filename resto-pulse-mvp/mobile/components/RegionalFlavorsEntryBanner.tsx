import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Animated, Keyboard, Pressable, StyleSheet, Text, View, type ImageSourcePropType, type ViewStyle } from 'react-native';

import { GastroColors } from '@/constants/theme';
import { useCity } from '@/context/city-context';
import { useBannerCrossfade } from '@/hooks/use-banner-crossfade';
import { listRegionalProducts } from '@/lib/api';
import type { RegionalProductItem } from '@/lib/types';

const MIN_HEIGHT = 58;

type Slide = {
  name: string;
  source: ImageSourcePropType | { uri: string };
};

type Props = {
  style?: ViewStyle;
};

function buildSlides(items: RegionalProductItem[]): Slide[] {
  return items
    .filter((row) => Boolean(row.image_url?.trim()))
    .map((row) => ({
      name: row.name,
      source: { uri: row.image_url!.trim() },
    }));
}

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
        setCount(null);
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

  if (count === 0) return null;

  const countLine =
    count == null
      ? `${cityLabel} · yöresel ürünler`
      : count === 0
        ? `${cityLabel} · yakında liste`
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
      accessibilityLabel="Yoresel lezzetler">
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
          <View style={styles.mediaFallback} />
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
        {slideB ? (
          <Animated.View style={[styles.productTag, { opacity: opacityB }]} pointerEvents="none">
            <Text style={styles.productTagText} numberOfLines={1}>
              {slideB.name}
            </Text>
          </Animated.View>
        ) : null}
      </View>

      <View style={styles.content} pointerEvents="none">
        <View style={styles.textBlock}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Yöresel Lezzetler</Text>
          </View>
          <Text style={styles.title}>{countLine}</Text>
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
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: '#141414',
    minHeight: MIN_HEIGHT,
    flex: 1,
  },
  pressed: { opacity: 0.94, transform: [{ scale: 0.995 }] },
  mediaClip: { ...StyleSheet.absoluteFillObject },
  mediaFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245,158,11,0.12)',
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textBlock: { gap: 4 },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.55)',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  pillText: {
    color: GastroColors.gold,
    fontSize: 10,
    fontWeight: '900',
    ...textShadow,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    ...textShadow,
  },
  productTag: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    maxWidth: '58%',
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  productTagText: {
    color: '#fff',
    fontSize: 10,
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
