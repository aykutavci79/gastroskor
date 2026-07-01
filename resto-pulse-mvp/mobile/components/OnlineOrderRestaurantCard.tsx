import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { GastroColorScheme, GastroShadowScheme } from '@/constants/theme';
import { onlineOrderInk, type OnlineOrderUiTone } from '@/constants/online-order-theme';
import { categoryLabel } from '@/constants/online-order-categories';
import { useGastroTheme } from '@/context/theme-context';
import { resolveCardCoverUrl } from '@/lib/card-cover';
import { coerceNumber } from '@/lib/coerce-number';
import { ensureArray } from '@/lib/ensure-array';
import { formatPriceTl } from '@/lib/format-price-tl';
import { formatDeliveryFeeLabel, resolveDeliveryFeeTl } from '@/lib/delivery-fee';
import {
  formatDiscountBadgeLabel,
  formatDiscountBadgeSubline,
  resolveDiscountBandVisual,
} from '@/lib/discount-band-visual';
import { resolveRatingBandVisual } from '@/lib/rating-band-visual';
import { resolveOnlineMenuDiscountPercent } from '@/lib/resolve-online-discount';
import { resolveCategoryVisual } from '@/lib/restaurant-category-visual';
import type { RestaurantListItem, RestaurantMenuItem, VoiceMenuMatch } from '@/lib/types';

type Props = {
  restaurant: RestaurantListItem;
  href: string;
  distanceLabel?: string | null;
  googleRating?: number | null;
  voiceMatches?: VoiceMenuMatch[];
  voiceLetter?: string | null;
  showProductPrice?: boolean;
  tone?: OnlineOrderUiTone;
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
  tone = 'default',
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, shadow } = useGastroTheme();
  const styles = useMemo(() => createStyles(colors, shadow, tone), [colors, shadow, tone]);
  const cover = resolveCardCoverUrl(restaurant);
  const menuPreview = ensureArray<RestaurantMenuItem>(restaurant.menu_preview);
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
  const ratingVisual = resolveRatingBandVisual(rating);
  const ratingReviewCount = orderRatings?.review_count ?? restaurant.google_review_count ?? null;
  const ratingUsesLezzet = lezzetAvg != null && lezzetAvg > 0;

  const deliverySubline =
    orderRatings && orderRatings.review_count > 0
      ? [
          orderRatings.servis_avg != null ? t('order.serviceAvg', { avg: orderRatings.servis_avg.toFixed(1) }) : null,
          orderRatings.kurye_avg != null ? t('order.courierAvg', { avg: orderRatings.kurye_avg.toFixed(1) }) : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : null;

  const hoursRangeLabel = restaurant.online_order_hours_range_label?.trim() ?? null;
  const orderOpenNow = restaurant.online_orders_open_now ?? restaurant.online_orders_available ?? true;

  const promo = restaurant.promo;
  const offerText = promo?.direct_order_text?.trim() ?? '';
  const discountPercent = resolveOnlineMenuDiscountPercent(restaurant);
  const discountVisual = resolveDiscountBandVisual(discountPercent);
  const showOfferChip = offerText.length > 0 && discountVisual == null;

  const deliveryFeeTl =
    restaurant.delivery_fee_tl ??
    resolveDeliveryFeeTl(restaurant.distance_meters ?? null);

  const metaParts = [
    distanceLabel ?? null,
    deliveryFeeTl != null ? formatDeliveryFeeLabel(deliveryFeeTl) : null,
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

  const leftStripeColor =
    ratingVisual && rating != null && rating > 0 ? ratingVisual.stripe : null;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        leftStripeColor != null && {
          borderLeftWidth: 3,
          borderLeftColor: leftStripeColor,
        },
        pressed && styles.cardPressed,
      ]}
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

        {!orderOpenNow && hoursRangeLabel ? (
          <Text style={styles.hoursLine} numberOfLines={1}>
            {hoursRangeLabel}
          </Text>
        ) : null}

        {ratingUsesLezzet ? (
          <Text style={styles.lezzetHint} numberOfLines={1}>
            {t('order.orderScorePill')}
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

        {discountVisual && discountPercent != null ? (
          <View style={styles.chipRow}>
            <View
              style={[
                styles.discountBadge,
                {
                  backgroundColor: discountVisual.background,
                  borderColor: discountVisual.border,
                },
              ]}>
              <Text
                style={[styles.discountBadgeMain, { color: discountVisual.text }]}
                numberOfLines={1}>
                {formatDiscountBadgeLabel(discountPercent)}
              </Text>
              <Text
                style={[styles.discountBadgeSub, { color: discountVisual.text }]}
                numberOfLines={1}>
                {formatDiscountBadgeSubline(discountPercent)}
              </Text>
            </View>
          </View>
        ) : showOfferChip ? (
          <View style={styles.chipRow}>
            <View style={styles.chipOffer}>
              <Text style={styles.chipOfferText} numberOfLines={1}>
                {offerText}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.trailing}>
        {ratingVisual && rating != null && rating > 0 ? (
          <View
            style={[
              styles.ratingPill,
              {
                backgroundColor: ratingVisual.softBackground,
                borderColor: ratingVisual.accent,
              },
            ]}>
            <Text style={[styles.ratingStar, { color: ratingVisual.accent }]}>★</Text>
            <Text style={styles.ratingScore}>{rating.toFixed(1)}</Text>
            {ratingReviewCount != null && ratingReviewCount > 0 ? (
              <Text style={styles.ratingCount}>
                ({ratingReviewCount >= 500 ? '500+' : ratingReviewCount.toLocaleString('tr-TR')})
              </Text>
            ) : null}
          </View>
        ) : null}
        <Text style={styles.cta}>{t('order.orderCta')}</Text>
      </View>
    </Pressable>
  );
}

function createStyles(
  colors: GastroColorScheme,
  shadow: GastroShadowScheme,
  tone: OnlineOrderUiTone,
) {
  const ink = onlineOrderInk(tone, colors);
  const light = tone === 'light';
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: light ? ink.panel : colors.panel,
      borderWidth: 1,
      borderColor: ink.border,
      ...(light ? {} : shadow.card),
    },
    cardPressed: {
      opacity: 0.92,
    },
    thumbWrap: {
      flexShrink: 0,
      marginTop: 2,
    },
    thumb: {
      width: THUMB,
      height: THUMB,
      borderRadius: 8,
      backgroundColor: ink.input,
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
      color: colors.accent,
      fontSize: 13,
      fontWeight: '900',
      flexShrink: 0,
    },
    name: {
      flex: 1,
      color: ink.text,
      fontSize: 13,
      fontWeight: '800',
      lineHeight: 17,
    },
    metaLine: {
      color: ink.muted,
      fontSize: 11,
      fontWeight: '600',
    },
    hoursLine: {
      color: ink.bad,
      fontSize: 11,
      fontWeight: '700',
    },
    lezzetHint: {
      color: ink.muted,
      fontSize: 10,
      fontWeight: '600',
    },
    subLine: {
      color: ink.muted,
      fontSize: 11,
      fontWeight: '600',
    },
    productPriceLine: {
      color: light ? colors.accent : colors.gold,
      fontSize: 11,
      fontWeight: '700',
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 4,
    },
    chipOffer: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: light ? 'rgba(217, 119, 6, 0.35)' : 'rgba(255, 183, 3, 0.4)',
      backgroundColor: light ? 'rgba(255, 183, 3, 0.18)' : 'rgba(255, 183, 3, 0.15)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      flexShrink: 1,
      maxWidth: '100%',
    },
    chipOfferText: {
      color: light ? ink.amber : colors.gold,
      fontSize: 10,
      fontWeight: '800',
    },
    discountBadge: {
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 4,
      flexShrink: 1,
      maxWidth: '100%',
      gap: 1,
    },
    discountBadgeMain: {
      fontSize: 11,
      fontWeight: '900',
    },
    discountBadgeSub: {
      fontSize: 9,
      fontWeight: '700',
      opacity: 0.92,
    },
    trailing: {
      alignItems: 'flex-end',
      gap: 8,
      flexShrink: 0,
      paddingTop: 2,
    },
    ratingPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 4,
    },
    ratingStar: {
      fontSize: 11,
      fontWeight: '700',
      lineHeight: 13,
    },
    ratingScore: {
      color: ink.text,
      fontSize: 12,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
      letterSpacing: -0.2,
      lineHeight: 14,
    },
    ratingCount: {
      color: ink.muted,
      fontWeight: '500',
      fontSize: 10,
      lineHeight: 13,
    },
    cta: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '800',
    },
  });
}
