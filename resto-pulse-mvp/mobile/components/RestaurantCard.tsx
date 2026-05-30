import * as Linking from 'expo-linking';
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FeaturedCardFrame } from '@/components/FeaturedCardFrame';
import { GastroColors } from '@/constants/theme';
import { resolveCardCoverUrl } from '@/lib/card-cover';
import { resolveCategoryVisual } from '@/lib/restaurant-category-visual';
import { estimateTravelMinutes, formatDistanceLabel } from '@/lib/travel-estimate';
import { resolveRestaurantDetailId } from '@/lib/uuid';
import type { RestaurantListItem, RestaurantTrendingItem } from '@/lib/types';

type Props = {
  restaurant: RestaurantListItem & Partial<RestaurantTrendingItem>;
  href?: string | null;
  rank?: number;
  distanceLabel?: string | null;
  googleRating?: number | null;
  googleReviewCount?: number | null;
  cornerBadge?: string | null;
  featuredBorder?: boolean;
  onReviewsPress?: () => void;
};

function coverImageUrl(restaurant: RestaurantListItem): string | null {
  return resolveCardCoverUrl(restaurant);
}

export function RestaurantCard({
  restaurant,
  href,
  rank,
  distanceLabel,
  googleRating,
  googleReviewCount,
  cornerBadge,
  featuredBorder,
  onReviewsPress,
}: Props) {
  const router = useRouter();
  const isPaidPartner = Boolean(restaurant.is_premium_partner || restaurant.promo);
  const showFeatured = featuredBorder ?? isPaidPartner;
  const badgeLabel =
    cornerBadge !== undefined ? cornerBadge : isPaidPartner ? 'ÖNE ÇIKAN' : null;
  const cover = coverImageUrl(restaurant);

  const visual = resolveCategoryVisual({
    category: restaurant.category,
    name: restaurant.name,
    menuItems: restaurant.menu_preview,
  });

  const detailId = resolveRestaurantDetailId(restaurant);
  const resolvedHref =
    href === null ? null : href ?? (detailId ? `/restaurant/${detailId}` : null);

  const cityLine = restaurant.city ?? restaurant.district ?? 'Konum belirtilmedi';
  const distance =
    distanceLabel ??
    formatDistanceLabel({
      distance_km: restaurant.distance_km,
      distance_meters: restaurant.distance_meters,
    });

  const googleScore =
    googleRating ?? restaurant.week_avg_rating ?? restaurant.google_rating ?? null;
  const googleCount =
    googleReviewCount ??
    restaurant.google_user_ratings_total ??
    restaurant.google_review_count ??
    null;
  const gastroScore = restaurant.avg_rating;

  const mapsUrl = restaurant.maps_directions_url?.trim() || null;
  const travel =
    restaurant.distance_meters != null && restaurant.distance_meters > 0
      ? estimateTravelMinutes(restaurant.distance_meters)
      : null;

  function openDetail() {
    if (resolvedHref) router.push(resolvedHref as Href);
  }

  function openReviews() {
    if (onReviewsPress) {
      onReviewsPress();
      return;
    }
    openDetail();
  }

  return (
    <Pressable
      style={styles.cardWrap}
      onPress={resolvedHref ? openDetail : undefined}
      android_ripple={resolvedHref ? { color: GastroColors.overlayRipple } : undefined}>
      <FeaturedCardFrame featured={showFeatured} badge={badgeLabel}>
        <View style={styles.mainRow}>
          <View style={styles.content}>
            <View style={styles.topRow}>
              {rank != null ? <Text style={styles.rankBadge}>#{rank}</Text> : <View />}
              {distance ? <Text style={styles.distance}>{distance}</Text> : null}
            </View>

            <Text style={styles.name} numberOfLines={2}>
              {restaurant.name}
            </Text>
            <Text style={styles.city} numberOfLines={1}>
              {cityLine}
            </Text>

            {(googleScore != null || gastroScore != null) && (
              <View style={styles.scoreRow}>
                {googleScore != null ? (
                  <Text style={styles.googleScore} numberOfLines={1}>
                    <Text style={styles.star}>★ </Text>
                    Google {googleScore.toFixed(1)}
                    {googleCount != null && googleCount > 0 ? (
                      <Text style={styles.reviewCount}>
                        {' '}
                        · {googleCount.toLocaleString('tr-TR')}
                      </Text>
                    ) : null}
                  </Text>
                ) : null}
                {gastroScore != null ? (
                  <Text style={styles.gsScore} numberOfLines={1}>
                    <Text style={styles.star}>★ </Text>
                    GS {gastroScore.toFixed(1)}
                  </Text>
                ) : null}
              </View>
            )}

            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText} numberOfLines={1}>
                {visual.emoji} {visual.label}
              </Text>
            </View>

            {(mapsUrl || travel) && (
              <View style={styles.actionRow}>
                {mapsUrl ? (
                  <Pressable
                    style={styles.ghostBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      void Linking.openURL(mapsUrl);
                    }}>
                    <Text style={styles.ghostBtnText}>🗺️ Haritada Aç</Text>
                  </Pressable>
                ) : null}
                {travel ? (
                  <View style={styles.travelBadges}>
                    <View style={styles.travelPill}>
                      <Text style={styles.travelPillText}>🚶 {travel.walkMin} dk</Text>
                    </View>
                    <View style={styles.travelPill}>
                      <Text style={styles.travelPillText}>🚗 {travel.driveMin} dk</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            )}

            {(onReviewsPress || resolvedHref) && (
              <Pressable
                style={styles.reviewsLinkWrap}
                onPress={(e) => {
                  e.stopPropagation();
                  openReviews();
                }}>
                <Text style={styles.reviewsLink}>Yorumları Gör →</Text>
              </Pressable>
            )}
          </View>

          {cover ? (
            <Image source={{ uri: cover }} style={styles.cover} contentFit="cover" />
          ) : null}
        </View>
      </FeaturedCardFrame>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    marginVertical: 6,
  },
  mainRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  content: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  cover: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: GastroColors.input,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 16,
  },
  rankBadge: {
    color: GastroColors.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  distance: {
    color: GastroColors.muted,
    fontSize: 11,
  },
  name: {
    color: GastroColors.text,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  city: {
    color: GastroColors.muted,
    fontSize: 11,
  },
  scoreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  star: {
    color: GastroColors.gold,
  },
  googleScore: {
    color: GastroColors.google,
    fontSize: 12,
    fontWeight: '600',
  },
  reviewCount: {
    color: GastroColors.muted,
    fontWeight: '500',
  },
  gsScore: {
    color: GastroColors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: GastroColors.input,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryText: {
    color: GastroColors.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: GastroColors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ghostBtnText: {
    color: GastroColors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  travelBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  travelPill: {
    borderWidth: 1,
    borderColor: GastroColors.border,
    borderRadius: 8,
    backgroundColor: GastroColors.input,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  travelPillText: {
    color: GastroColors.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  reviewsLinkWrap: {
    alignSelf: 'flex-end',
  },
  reviewsLink: {
    color: GastroColors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
});
