import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GastroColors, GastroStyles } from '@/constants/theme';
import { resolveCategoryVisual } from '@/lib/restaurant-category-visual';
import type { RestaurantListItem } from '@/lib/types';

type Props = { restaurant: RestaurantListItem };

export function RestaurantCard({ restaurant }: Props) {
  const premium = Boolean(restaurant.is_premium_partner);
  const location = [restaurant.district, restaurant.city].filter(Boolean).join(', ');
  const visual = resolveCategoryVisual({
    category: restaurant.category,
    name: restaurant.name,
    menuItems: restaurant.menu_preview,
  });

  return (
    <Link href={`/restaurant/${restaurant.id}`} asChild>
      <Pressable
        style={[styles.card, premium && styles.cardPremium]}
        android_ripple={{ color: GastroColors.overlayRipple }}>
        <Text style={styles.watermark} accessibilityElementsHidden>
          {visual.emoji}
        </Text>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.name}>{restaurant.name}</Text>
            <Text style={styles.meta}>{location || 'Konum belirtilmedi'}</Text>
          </View>
          <View style={GastroStyles.ratingBox}>
            <Text style={styles.ratingLabel}>Puan</Text>
            <Text style={styles.rating}>
              {restaurant.avg_rating != null ? restaurant.avg_rating.toFixed(1) : '—'}
            </Text>
          </View>
        </View>
        <Text style={styles.category}>
          {visual.emoji} {visual.label}
        </Text>
        {restaurant.promo?.direct_order_text ? (
          <Text style={styles.promo}>{restaurant.promo.direct_order_text}</Text>
        ) : null}
        {restaurant.menu_preview && restaurant.menu_preview.length > 0 ? (
          <View style={styles.menuPreview}>
            {restaurant.menu_preview.slice(0, 2).map((item) => (
              <Text key={item.id} style={styles.menuLine} numberOfLines={1}>
                <Text style={styles.menuItemName}>{item.name}</Text>
                <Text style={styles.menuItemPrice}>
                  {' '}
                  · {item.price_tl.toLocaleString('tr-TR')} TL
                </Text>
              </Text>
            ))}
          </View>
        ) : null}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    ...GastroStyles.card,
    gap: 8,
  },
  cardPremium: {
    ...GastroStyles.cardFeatured,
  },
  watermark: {
    position: 'absolute',
    right: 10,
    top: 8,
    fontSize: 28,
    opacity: 0.15,
  },
  row: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  name: { color: GastroColors.text, fontSize: 17, fontWeight: '700' },
  meta: { color: GastroColors.muted, fontSize: 13, marginTop: 2 },
  ratingLabel: { color: GastroColors.muted, fontSize: 10 },
  rating: { color: GastroColors.gold, fontSize: 18, fontWeight: '800' },
  category: {
    alignSelf: 'flex-start',
    backgroundColor: GastroColors.input,
    color: GastroColors.muted,
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  promo: { color: GastroColors.accent, fontSize: 11, fontWeight: '600' },
  menuPreview: { gap: 2 },
  menuLine: { fontSize: 12 },
  menuItemName: { color: GastroColors.muted },
  menuItemPrice: { color: GastroColors.gold, fontWeight: '600' },
});
