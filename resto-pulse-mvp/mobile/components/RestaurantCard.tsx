import * as Linking from 'expo-linking';
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FeaturedCardFrame } from '@/components/FeaturedCardFrame';
import { MahrecBadge } from '@/components/MahrecBadge';
import { RestaurantMenuPreview } from '@/components/RestaurantMenuPreview';
import { RestaurantFollowButton } from '@/components/RestaurantFollowButton';
import { RestaurantShareButton } from '@/components/RestaurantShareButton';
import { GastroColors } from '@/constants/theme';
import { useSession } from '@/context/session-context';
import { resolveCardCoverUrl } from '@/lib/card-cover';
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
  const { user } = useSession();
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
  const ratingForBand = resolveCardRatingScore({
    gastroRating: gastroScore,
    googleRating: googleScore,
  });
  const ratingVisual = resolveRatingBandVisual(ratingForBand);

  const mapsUrl = restaurant.maps_directions_url?.trim() || null;
  const followId = resolveRestaurantDetailId(restaurant);
  const travel =
    restaurant.distance_meters != null && restaurant.distance_meters > 0
      ? estimateTravelMinutes(restaurant.distance_meters)
      : null;
  const menuItems = restaurantMenuItems(restaurant);
  const menuCount = restaurantMenuItemCount(restaurant);
  const showMenu = hasPublicMenu(restaurant);

  function openDetail() {
    if (resolvedHref) router.push(resolvedHref as Href);
  }

  function openMenu() {
    if (!detailId) return;
    router.push({
      pathname: '/restaurant/[id]',
      params: { id: detailId, focus: 'menu' },
    });
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
        <View style={styles.cardBody}>
          {ratingVisual ? (
            <View
              style={[
                styles.ratingStripe,
                { backgroundColor: ratingVisual.stripe },
                showFeatured ? styles.ratingStripeFeatured : styles.ratingStripePlain,
              ]}
            />
          ) : null}
          <View style={[styles.cardContent, !ratingVisual && styles.cardContentNoStripe]}>
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
                      ratingVisual ? (
                        <View
                          style={[
                            styles.googleScorePill,
                            {
                              backgroundColor: ratingVisual.softBackground,
                              borderColor: ratingVisual.accent,
                            },
                          ]}>
                          <Text
                            style={[styles.googleScorePillText, { color: ratingVisual.accent }]}
                            numberOfLines={1}>
                            <Text style={[styles.star, { color: ratingVisual.accent }]}>★ </Text>
                            Google {googleScore.toFixed(1)}
                            {googleCount != null && googleCount > 0 ? (
                              <Text style={styles.reviewCountInPill}>
                                {' '}
                                · {googleCount.toLocaleString('tr-TR')}
                              </Text>
                            ) : null}
                          </Text>
                        </View>
                      ) : (
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
                      )
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

                {(restaurant.check_in_visitor_count ?? 0) > 0 ? (
                  <Text style={styles.checkInCount}>
                    👣 {(restaurant.check_in_visitor_count ?? 0).toLocaleString('tr-TR')} ziyaretçi
                  </Text>
                ) : null}

                <MahrecBadge
                  hasGeographicalIndication={Boolean(restaurant.has_geographical_indication)}
                  giProductName={restaurant.gi_product_name ?? null}
                  geoIndications={restaurant.geo_indications ?? []}
                />

                {(mapsUrl || travel) && (
                  <View style={styles.actionRow}>
                    {mapsUrl ? (
                      <Pressable
                        style={styles.ghostBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          void Linking.openURL(mapsUrl);
                        }}>
                        <Text style={styles.ghostBtnText}>🧭 Yol tarifi</Text>
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

                <View style={styles.followRow}>
                  <RestaurantFollowButton
                    restaurantId={followId}
                    userEmail={user?.email}
                    detailHref={followId ? null : resolvedHref}
                    compact
                  />
                  <RestaurantShareButton
                    restaurant={restaurant}
                    googleRating={googleScore}
                    gastroRating={gastroScore}
                    compact
                  />
                </View>

                {showMenu && detailId ? (
                  <View style={styles.menuBlock}>
                    <Pressable
                      style={styles.menuChip}
                      onPress={(e) => {
                        e.stopPropagation();
                        openMenu();
                      }}>
                      <Text style={styles.menuChipText}>📋 Menü</Text>
                    </Pressable>
                    {menuItems.length > 0 ? (
                      <RestaurantMenuPreview items={menuItems} totalCount={menuCount} />
                    ) : null}
                  </View>
                ) : null}

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
          </View>
        </View>
      </FeaturedCardFrame>
    </Pressable>
  );
}

const STRIPE_WIDTH = 5;

const styles = StyleSheet.create({
  cardWrap: {
    marginVertical: 6,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginHorizontal: -12,
    marginVertical: -12,
  },
  cardContent: {
    flex: 1,
    paddingTop: 12,
    paddingRight: 12,
    paddingBottom: 12,
    paddingLeft: 10,
  },
  cardContentNoStripe: {
    paddingLeft: 12,
  },
  ratingStripe: {
    width: STRIPE_WIDTH,
  },
  ratingStripePlain: {
    borderTopLeftRadius: 15,
    borderBottomLeftRadius: 15,
  },
  ratingStripeFeatured: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
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
  googleScorePill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  googleScorePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reviewCountInPill: {
    color: GastroColors.muted,
    fontWeight: '500',
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
  checkInCount: {
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
  followRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  menuBlock: { gap: 4, marginTop: 2 },
  menuChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 183, 3, 0.4)',
    backgroundColor: 'rgba(255, 183, 3, 0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  menuChipText: { color: GastroColors.gold, fontSize: 11, fontWeight: '700' },
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
