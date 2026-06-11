import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GastroColors, GastroShadow } from '@/constants/theme';
import { categoryLabel } from '@/constants/online-order-categories';
import { resolveCardCoverUrl } from '@/lib/card-cover';
import { coerceNumber } from '@/lib/coerce-number';
import { ensureArray } from '@/lib/ensure-array';
import { coercePriceTl, formatPriceTl } from '@/lib/format-price-tl';
import { resolveCategoryVisual } from '@/lib/restaurant-category-visual';
import { restaurantMenuItemCount } from '@/lib/restaurant-menu';
import type { RestaurantListItem, VoiceMenuMatch } from '@/lib/types';

type Props = {
  restaurant: RestaurantListItem;
  href: string;
  distanceLabel?: string | null;
  googleRating?: number | null;
  voiceMatches?: VoiceMenuMatch[];
  voiceLetter?: string | null;
};

export function OnlineOrderRestaurantCard({
  restaurant,
  href,
  distanceLabel,
  googleRating,
  voiceMatches,
  voiceLetter,
}: Props) {
  const router = useRouter();
  const cover = resolveCardCoverUrl(restaurant);
  const menuPreview = ensureArray(restaurant.menu_preview);
  const visual = resolveCategoryVisual({
    category: restaurant.category,
    name: restaurant.name,
    menuItems: menuPreview,
  });
  const rating = coerceNumber(googleRating ?? restaurant.google_rating ?? restaurant.avg_rating);
  const menuCount = restaurantMenuItemCount({ ...restaurant, menu_preview: menuPreview });
  const kitchens = ensureArray<string>(restaurant.online_order_categories).slice(0, 3);
  const voiceList = ensureArray<VoiceMenuMatch>(voiceMatches);
  const previewPrice =
    coercePriceTl(voiceList[0]?.price_tl) ?? coercePriceTl(menuPreview[0]?.price_tl);
  const voiceMatchLabel =
    voiceList.length > 0
      ? voiceList
          .slice(0, 2)
          .map((match) => {
            const price = formatPriceTl(match.price_tl, 0);
            return price ? `${match.label} ${price} ₺` : match.label;
          })
          .join(' · ')
      : null;

  function openOrder() {
    router.push(href as Href);
  }

  return (
    <View style={styles.card}>
      <Pressable onPress={openOrder} style={styles.photoWrap}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={[styles.photo, styles.photoFallback]}>
            <Text style={styles.fallbackEmoji}>{visual.emoji}</Text>
          </View>
        )}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Sipariş açık</Text>
        </View>
        {voiceLetter ? (
          <View style={styles.letterBadge}>
            <Text style={styles.letterBadgeText}>{voiceLetter}</Text>
          </View>
        ) : null}
      </Pressable>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {restaurant.name}
        </Text>

        <View style={styles.metaRow}>
          {rating != null && rating > 0 ? (
            <Text style={styles.rating}>★ {rating.toFixed(1)}</Text>
          ) : null}
          {distanceLabel ? <Text style={styles.metaMuted}>📍 {distanceLabel}</Text> : null}
        </View>

        {kitchens.length ? (
          <Text style={styles.kitchens} numberOfLines={1}>
            {kitchens.map((slug) => categoryLabel(slug)).join(' · ')}
          </Text>
        ) : null}

        {voiceMatchLabel ? (
          <Text style={styles.voiceMatch} numberOfLines={2}>
            Eşleşen: {voiceMatchLabel}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.priceBlock}>
            {previewPrice != null ? (
              <Text style={styles.priceFrom}>{formatPriceTl(previewPrice, 0)} ₺’den</Text>
            ) : menuCount > 0 ? (
              <Text style={styles.priceFrom}>{menuCount} ürün</Text>
            ) : (
              <Text style={styles.priceFrom}>Menüye bak</Text>
            )}
          </View>
          <Pressable style={styles.cta} onPress={openOrder}>
            <Text style={styles.ctaText}>SİPARİŞ VER</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: GastroColors.panel,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.25)',
    ...GastroShadow.card,
  },
  photoWrap: { position: 'relative' },
  photo: {
    width: '100%',
    height: 168,
    backgroundColor: GastroColors.input,
  },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackEmoji: { fontSize: 48 },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: GastroColors.accent,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  letterBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: GastroColors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterBadgeText: { color: '#141414', fontSize: 16, fontWeight: '900' },
  body: { padding: 14, gap: 6 },
  name: {
    color: GastroColors.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  rating: { color: GastroColors.gold, fontSize: 14, fontWeight: '800' },
  metaMuted: { color: GastroColors.muted, fontSize: 13, fontWeight: '600' },
  kitchens: { color: GastroColors.accent, fontSize: 12, fontWeight: '600' },
  voiceMatch: { color: GastroColors.gold, fontSize: 12, fontWeight: '700', lineHeight: 16 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 4,
  },
  priceBlock: { flex: 1 },
  priceFrom: { color: GastroColors.text, fontSize: 15, fontWeight: '700' },
  cta: {
    backgroundColor: GastroColors.gold,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  ctaText: {
    color: '#141414',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
});
