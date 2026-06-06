import { useMemo } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text } from 'react-native';

import { GastroColors } from '@/constants/theme';
import { buildRestaurantShareText, type RestaurantShareInput } from '@/lib/restaurant-share';

type Props = {
  restaurant: RestaurantShareInput;
  googleRating?: number | null;
  gastroRating?: number | null;
  compact?: boolean;
  label?: string;
};

export function RestaurantShareButton({
  restaurant,
  googleRating,
  gastroRating,
  compact = false,
  label = 'Paylaş',
}: Props) {
  const shareText = useMemo(
    () => buildRestaurantShareText(restaurant, { googleRating, gastroRating }),
    [restaurant, googleRating, gastroRating],
  );
  const shareUrl = useMemo(() => shareText.split('\n').pop() ?? '', [shareText]);

  async function shareCard() {
    try {
      await Share.share(
        Platform.OS === 'ios'
          ? { message: shareText, url: shareUrl, title: restaurant.name }
          : { message: shareText, title: restaurant.name },
      );
    } catch {
      /* kullanici iptal */
    }
  }

  return (
    <Pressable
      style={[styles.btn, compact && styles.btnCompact]}
      onPress={(e) => {
        e?.stopPropagation?.();
        void shareCard();
      }}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel="Restorani paylas">
      <Text style={[styles.btnText, compact && styles.btnTextCompact]}>{compact ? '↗' : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GastroColors.accent,
    backgroundColor: GastroColors.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  btnCompact: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    minWidth: 32,
    alignItems: 'center',
  },
  btnText: { color: GastroColors.accent, fontWeight: '800', fontSize: 13 },
  btnTextCompact: { fontSize: 14, fontWeight: '900' },
});
