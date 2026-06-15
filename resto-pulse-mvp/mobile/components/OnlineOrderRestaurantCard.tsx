import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { GastroColorScheme, GastroShadowScheme } from '@/constants/theme';
import { categoryLabel } from '@/constants/online-order-categories';
import { useGastroTheme } from '@/context/theme-context';
import { resolveCardCoverUrl } from '@/lib/card-cover';
import { coerceNumber } from '@/lib/coerce-number';
import { ensureArray } from '@/lib/ensure-array';
import { formatPriceTl } from '@/lib/format-price-tl';
import { resolveCategoryVisual } from '@/lib/restaurant-category-visual';
import type { RestaurantListItem, VoiceMenuMatch } from '@/lib/types';

type Props = {
  restaurant: RestaurantListItem;
  href: string;
  distanceLabel?: string | null;
  googleRating?: number | null;
  voiceMatches?: VoiceMenuMatch[];
  voiceLetter?: string | null;
  showProductPrice?: boolean;
};

const THUMB = 48;

function formatProductPriceLine(matches: VoiceMenuMatch[]): string | null {
  const first = matches[0];
  if (!first) return null;
  const price = formatPriceTl(first.price_tl, 0);
  return price ? `${first.label} ${price} ₺` : first.label;
}

export function OnlineOrderRestaurantCard({
  restaurant,
  href,
  distanceLabel,
  googleRating,
  voiceMatches,
  voiceLetter,
  showProductPrice = false,
}: Props) {
  const router = useRouter();
  const { colors, shadow } = useGastroTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [colors, shadow]);
  const cover = resolveCardCoverUrl(restaurant);
  const menuPreview = ensureArray(restaurant.menu_preview);
  const visual = resolveCategoryVisual({
    category: restaurant.category,
    name: restaurant.name,
    menuItems: menuPreview,
  });
  const orderRatings = restaurant.order_ratings;
  const lezzetAvg = orderRatings?.lezzet_avg;
  const rating = coerceNumber(
    lezzetAvg ?? googleRating ?? restaurant.google_rating ?? restaurant.avg_rating,
  );
  const deliverySubline =
    orderRatings && orderRatings.review_count > 0
      ? [
          orderRatings.servis_avg != null ? `Servis ${orderRatings.servis_avg.toFixed(1)}` : null,
          orderRatings.kurye_avg != null ? `Kurye ${orderRatings.kurye_avg.toFixed(1)}` : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : null;

  const metaParts = [
    rating != null && rating > 0
      ? lezzetAvg != null
        ? `★ ${rating.toFixed(1)} lezzet`
        : `★ ${rating.toFixed(1)}`
      : null,
    distanceLabel ?? null,
  ].filter(Boolean);

  const voiceList = ensureArray<VoiceMenuMatch>(voiceMatches);
  const productPriceLine = showProductPrice ? formatProductPriceLine(voiceList) : null;
  const kitchens = ensureArray<string>(restaurant.online_order_categories)
    .slice(0, 2)
    .map((slug) => categoryLabel(slug))
    .join(' · ');

  function openOrder() {
    router.push(href as Href);
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={openOrder}
      android_ripple={{ color: colors.overlayRipple }}>
      <View style={styles.thumbWrap}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]}>
            <Text style={styles.fallbackEmoji}>{visual.emoji}</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          {voiceLetter ? <Text style={styles.letter}>{voiceLetter}</Text> : null}
          <Text style={styles.name} numberOfLines={1}>
            {restaurant.name}
          </Text>
        </View>

        {metaParts.length ? (
          <Text style={styles.metaLine} numberOfLines={1}>
            {metaParts.join(' · ')}
          </Text>
        ) : null}

        {deliverySubline ? (
          <Text style={styles.subLine} numberOfLines={1}>
            {deliverySubline}
          </Text>
        ) : null}

        {productPriceLine ? (
          <Text style={styles.productPriceLine} numberOfLines={1}>
            {productPriceLine}
          </Text>
        ) : kitchens ? (
          <Text style={styles.subLine} numberOfLines={1}>
            {kitchens}
          </Text>
        ) : null}
      </View>

      <Text style={styles.cta}>Sipariş →</Text>
    </Pressable>
  );
}

function createStyles(colors: GastroColorScheme, shadow: GastroShadowScheme) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadow.card,
    },
    cardPressed: {
      opacity: 0.92,
    },
    thumbWrap: {
      flexShrink: 0,
    },
    thumb: {
      width: THUMB,
      height: THUMB,
      borderRadius: 8,
      backgroundColor: colors.input,
    },
    thumbFallback: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    fallbackEmoji: { fontSize: 20 },
    content: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    letter: {
      color: colors.gold,
      fontSize: 13,
      fontWeight: '900',
      flexShrink: 0,
    },
    name: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
      lineHeight: 17,
    },
    metaLine: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '600',
    },
    subLine: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '600',
    },
    productPriceLine: {
      color: colors.gold,
      fontSize: 11,
      fontWeight: '700',
    },
    cta: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '800',
      flexShrink: 0,
    },
  });
}
