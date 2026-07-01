import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { RestaurantMenuPreview } from '@/components/RestaurantMenuPreview';
import { ReservationTheme } from '@/constants/reservation-theme';
import {
  isTesterReservationShowcasePlace,
  testerShowcaseSourcesForPlace,
} from '@/constants/tester-reservation-showcase';
import { useBannerCrossfade } from '@/hooks/use-banner-crossfade';
import {
  resolveRestaurantHeroPhotos,
} from '@/lib/restaurant-card-photos';
import {
  resolveCardRatingScore,
  resolveRatingBandVisual,
} from '@/lib/rating-band-visual';
import { resolveCategoryVisual } from '@/lib/restaurant-category-visual';
import {
  hasPublicMenu,
  restaurantMenuItemCount,
  restaurantMenuItems,
} from '@/lib/restaurant-menu';
import type { RestaurantListItem } from '@/lib/types';

type Props = {
  restaurant: RestaurantListItem;
  href: string;
  floorBackgroundUrl?: string | null;
  googleRating?: number | null;
  googleReviewCount?: number | null;
  distanceLabel?: string | null;
  /** Örnek vitrin kartı — tıklanınca yönlendirme yok. */
  preview?: boolean;
};

export function ReservationRestaurantCard({
  restaurant,
  href,
  floorBackgroundUrl,
  googleRating,
  googleReviewCount,
  distanceLabel,
  preview = false,
}: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const localSlides = useMemo((): ImageSourcePropType[] => {
    if (preview || isTesterReservationShowcasePlace(restaurant.google_place_id)) {
      return testerShowcaseSourcesForPlace(restaurant.google_place_id);
    }
    return [];
  }, [preview, restaurant.google_place_id]);

  const photoUrls = useMemo(() => {
    if (localSlides.length > 0) return [] as string[];
    return resolveRestaurantHeroPhotos(restaurant, { floorBackgroundUrl });
  }, [floorBackgroundUrl, localSlides.length, restaurant]);

  const slideCount = localSlides.length > 0 ? localSlides.length : photoUrls.length;
  const { opacityA, opacityB, indexA, indexB } = useBannerCrossfade(slideCount);

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

  const visual = resolveCategoryVisual({
    category: restaurant.category,
    name: restaurant.name,
    menuItems: restaurant.menu_preview,
  });
  const googleScore = googleRating ?? restaurant.google_rating ?? null;
  const googleCount = googleReviewCount ?? restaurant.google_review_count ?? null;
  const ratingVisual = resolveRatingBandVisual(
    resolveCardRatingScore({ gastroRating: restaurant.avg_rating, googleRating: googleScore }),
  );
  const menuItems = restaurantMenuItems(restaurant);
  const menuCount = restaurantMenuItemCount(restaurant);
  const showMenu =
    hasPublicMenu(restaurant) &&
    menuItems.length > 0 &&
    (restaurant.menu_item_count ?? menuCount) > 0;

  return (
    <Pressable
      style={[styles.wrap, preview && styles.wrapPreview]}
      onPress={() => {
        if (preview) return;
        router.push(href as Href);
      }}
      accessibilityRole="button"
      accessibilityLabel={
        preview ? `${restaurant.name}${t('rezervasyon.cardA11yPreview')}` : `${restaurant.name}${t('rezervasyon.cardA11ySelect')}`
      }>
      <View style={styles.hero}>
        {sourceA ? (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacityA }]}>
            <Image source={sourceA} style={StyleSheet.absoluteFill} contentFit="cover" />
          </Animated.View>
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.heroFallback]} />
        )}
        {sourceB && slideCount > 1 ? (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacityB }]}>
            <Image source={sourceB} style={StyleSheet.absoluteFill} contentFit="cover" />
          </Animated.View>
        ) : null}
        <View style={styles.heroShadeTop} />
        <View style={styles.heroShadeBottom} />

        <View style={styles.badge}>
          <Text style={styles.badgeText}>{preview ? t('rezervasyon.badgePreview') : t('rezervasyon.badgeFeatured')}</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.topRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.name} numberOfLines={2}>
                {restaurant.name}
              </Text>
              <Text style={styles.city} numberOfLines={1}>
                {restaurant.city ?? restaurant.district ?? t('rezervasyon.noLocation')}
              </Text>
            </View>
            {distanceLabel ? <Text style={styles.distance}>{distanceLabel}</Text> : null}
          </View>

          {googleScore != null && ratingVisual ? (
            <View
              style={[
                styles.ratingPill,
                { borderColor: ratingVisual.accent, backgroundColor: ratingVisual.softBackground },
              ]}>
              <Text style={[styles.ratingText, { color: ratingVisual.accent }]}>
                ★ Google {googleScore.toFixed(1)}
                {googleCount != null && googleCount > 0
                  ? ` · ${googleCount.toLocaleString('tr-TR')}`
                  : ''}
              </Text>
            </View>
          ) : null}

          <View style={styles.categoryPill}>
            <Text style={styles.categoryText} numberOfLines={1}>
              {visual.emoji} {visual.label}
            </Text>
          </View>

          {showMenu && menuItems.length > 0 ? (
            <View style={styles.menuBlock}>
              <View style={styles.menuChip}>
                <Text style={styles.menuChipText}>{t('rezervasyon.menuBtn')}</Text>
              </View>
              <RestaurantMenuPreview items={menuItems} totalCount={menuCount} />
            </View>
          ) : null}

          <View style={styles.footerRow}>
            <View style={styles.ctaPill}>
              <Text style={styles.ctaText}>{t('rezervasyon.selectTableBtn')}</Text>
            </View>
            <Pressable
              hitSlop={8}
              disabled={preview}
              onPress={(event) => {
                if (preview) return;
                event.stopPropagation();
                router.push(`/restaurant/${restaurant.id}` as Href);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${restaurant.name}${t('rezervasyon.reviewsSuffix')}`}>
              <Text style={styles.reviewsLink}>{t('rezervasyon.reviewsLink')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: ReservationTheme.accentWarm,
    backgroundColor: ReservationTheme.bg,
  },
  wrapPreview: {
    borderStyle: 'dashed',
    opacity: 0.96,
  },
  hero: {
    minHeight: 220,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  heroFallback: {
    backgroundColor: '#2a1520',
  },
  heroShadeTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,8,15,0.35)',
  },
  heroShadeBottom: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,8,15,0.55)',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 3,
    borderRadius: 6,
    backgroundColor: ReservationTheme.accentWarm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: ReservationTheme.ctaText,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  body: {
    position: 'relative',
    zIndex: 2,
    padding: 14,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleBlock: { flex: 1, minWidth: 0, gap: 2 },
  name: {
    color: ReservationTheme.text,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  city: {
    color: ReservationTheme.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  distance: {
    color: ReservationTheme.textSoft,
    fontSize: 11,
    fontWeight: '600',
  },
  ratingPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoryPill: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryText: {
    color: ReservationTheme.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  menuBlock: { gap: 4 },
  menuChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: ReservationTheme.border,
    backgroundColor: ReservationTheme.accentGlow,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  menuChipText: {
    color: ReservationTheme.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  ctaPill: {
    backgroundColor: ReservationTheme.accentWarm,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  ctaText: {
    color: ReservationTheme.ctaText,
    fontSize: 14,
    fontWeight: '800',
  },
  reviewsLink: {
    color: ReservationTheme.accent,
    fontSize: 12,
    fontWeight: '700',
  },
});
