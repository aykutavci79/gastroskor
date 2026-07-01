import { Image } from 'expo-image';
import { useMemo } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ReservationTheme } from '@/constants/reservation-theme';
import { testerShowcaseSourcesForPlace } from '@/constants/tester-reservation-showcase';
import { useBannerCrossfade } from '@/hooks/use-banner-crossfade';
import { resolveRestaurantHeroPhotos } from '@/lib/restaurant-card-photos';
import type { Restaurant } from '@/lib/types';
import type { ImageSourcePropType } from 'react-native';

type Props = {
  restaurant: Restaurant;
  floorBackgroundUrl?: string | null;
};

export function ReservationBookHeader({ restaurant, floorBackgroundUrl }: Props) {
  const localSlides = useMemo(
    () => testerShowcaseSourcesForPlace(restaurant.google_place_id),
    [restaurant.google_place_id],
  );
  const photoUrls = useMemo(() => {
    if (localSlides.length > 0) return [] as string[];
    return resolveRestaurantHeroPhotos(restaurant, { floorBackgroundUrl });
  }, [floorBackgroundUrl, localSlides.length, restaurant]);

  const slideCount = localSlides.length > 0 ? localSlides.length : photoUrls.length;
  const { opacityA, opacityB, indexA, indexB } = useBannerCrossfade(slideCount);
  const { t } = useTranslation();

  const sourceA: ImageSourcePropType | null =
    localSlides.length > 0
      ? (localSlides[indexA] ?? null)
      : photoUrls[indexA]
        ? { uri: photoUrls[indexA] }
        : null;
  const sourceB: ImageSourcePropType | null =
    localSlides.length > 1
      ? (localSlides[indexB] ?? null)
      : photoUrls[indexB]
        ? { uri: photoUrls[indexB] }
        : null;
  const location = restaurant.district ?? restaurant.city ?? t('rezervasyon.locationFallback');

  return (
    <View style={styles.wrap}>
      <View style={styles.media}>
        {sourceA ? (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacityA }]}>
            <Image source={sourceA} style={StyleSheet.absoluteFill} contentFit="cover" />
          </Animated.View>
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.fallback]} />
        )}
        {sourceB && slideCount > 1 ? (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacityB }]}>
            <Image source={sourceB} style={StyleSheet.absoluteFill} contentFit="cover" />
          </Animated.View>
        ) : null}
        <View style={styles.shadeTop} />
        <View style={styles.shadeBottom} />
      </View>

      <View style={styles.content}>
        <Text style={styles.tagline}>{t('rezervasyon.bookTagline')}</Text>
        <Text style={styles.name} numberOfLines={2}>
          {restaurant.name}
        </Text>
        <Text style={styles.meta}>{location}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: ReservationTheme.border,
    minHeight: 132,
  },
  media: { ...StyleSheet.absoluteFillObject },
  fallback: { backgroundColor: '#2a1520' },
  shadeTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,8,15,0.2)',
  },
  shadeBottom: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,8,15,0.78)',
  },
  content: {
    position: 'relative',
    zIndex: 2,
    padding: 16,
    justifyContent: 'flex-end',
    minHeight: 132,
    gap: 4,
  },
  tagline: {
    color: ReservationTheme.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  name: {
    color: ReservationTheme.text,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  meta: {
    color: ReservationTheme.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
