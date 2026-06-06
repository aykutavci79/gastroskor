import * as Linking from 'expo-linking';
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { RestaurantFollowButton } from '@/components/RestaurantFollowButton';
import { GastroColors, GastroShadow } from '@/constants/theme';
import { useSession } from '@/context/session-context';
import { resolveCardCoverUrl } from '@/lib/card-cover';
import { renderStarRow } from '@/lib/review-display';
import { resolveRestaurantDetailId } from '@/lib/uuid';
import type { RestaurantListItem, RestaurantTrendingItem } from '@/lib/types';

const CARD_W = 260;
const CARD_H = 212;
const PHOTO_H = 108;

type Props = {
  restaurant: RestaurantListItem & Partial<RestaurantTrendingItem>;
  href: string | null;
  distanceLabel?: string | null;
  googleRating?: number | null;
};

function locationLine(restaurant: RestaurantListItem): string | null {
  const parts = [restaurant.district, restaurant.city].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

function metaLine(distanceLabel?: string | null, location?: string | null): string | null {
  const parts = [distanceLabel ? `📍 ${distanceLabel}` : null, location ?? null].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

export function FeaturedCompactCard({ restaurant, href, distanceLabel, googleRating }: Props) {
  const router = useRouter();
  const { user } = useSession();
  const isPartner = Boolean(restaurant.is_premium_partner || restaurant.promo);
  const cover = resolveCardCoverUrl(restaurant);
  const rating = googleRating ?? restaurant.week_avg_rating ?? restaurant.google_rating ?? null;
  const mapsUrl = restaurant.maps_directions_url?.trim() || null;
  const location = locationLine(restaurant);
  const meta = metaLine(distanceLabel, location);
  const followId = resolveRestaurantDetailId(restaurant);

  function openNavigation() {
    if (mapsUrl) {
      void Linking.openURL(mapsUrl);
      return;
    }
    Alert.alert('Konum yok', 'Bu mekan için yol tarifi henüz hazır değil.');
  }

  function openDetail() {
    if (href) router.push(href as Href);
  }

  return (
    <View style={styles.frame}>
      <Pressable
        style={[styles.card, isPartner ? styles.cardFeatured : null]}
        onPress={openDetail}
        disabled={!href}
        accessibilityRole={href ? 'link' : undefined}
        accessibilityLabel={href ? `${restaurant.name} detay` : restaurant.name}>
        <View style={styles.photoWrap}>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.photo} contentFit="cover" />
          ) : (
            <View style={styles.photoFallback}>
              <Text style={styles.photoEmoji}>🍽️</Text>
            </View>
          )}
          {isPartner ? (
            <View style={styles.featuredBadge} pointerEvents="none">
              <Text style={styles.featuredBadgeText}>ÖNE ÇIKAN</Text>
            </View>
          ) : null}
          {mapsUrl ? (
            <Pressable
              style={styles.navHint}
              onPress={openNavigation}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Yol tarifi">
              <Text style={styles.navHintText}>🧭 Yol tarifi</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={2}>
            {restaurant.name}
          </Text>
          {rating != null ? (
            <Text style={styles.rating}>
              {renderStarRow(Math.round(rating))} {rating.toFixed(1)}
            </Text>
          ) : null}
          {meta ? (
            <Text style={styles.meta} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <RestaurantFollowButton
            restaurantId={followId}
            userEmail={user?.email}
            detailHref={followId ? null : href}
            compact
          />
          {href ? (
            <Pressable style={styles.detailBtn} onPress={openDetail} hitSlop={6}>
              <Text style={styles.detailBtnText}>Detay</Text>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

export const FEATURED_CARD_WIDTH = CARD_W;
export const FEATURED_CARD_HEIGHT = CARD_H;

const styles = StyleSheet.create({
  frame: { width: CARD_W },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: GastroColors.panel,
    borderWidth: 1,
    borderColor: GastroColors.border,
  },
  cardFeatured: {
    borderWidth: 2,
    borderColor: GastroColors.accent,
    ...GastroShadow.featured,
  },
  photoWrap: { height: PHOTO_H, backgroundColor: GastroColors.input },
  photo: { width: '100%', height: '100%' },
  photoFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photoEmoji: { fontSize: 36, opacity: 0.45 },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 6,
    backgroundColor: GastroColors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  featuredBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  navHint: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  navHintText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 2,
  },
  name: { color: GastroColors.text, fontSize: 12, fontWeight: '800', lineHeight: 16 },
  rating: { color: GastroColors.gold, fontSize: 10, fontWeight: '700' },
  meta: { color: GastroColors.muted, fontSize: 10 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 2,
    gap: 8,
  },
  detailBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GastroColors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  detailBtnText: { color: GastroColors.muted, fontSize: 11, fontWeight: '700' },
});
