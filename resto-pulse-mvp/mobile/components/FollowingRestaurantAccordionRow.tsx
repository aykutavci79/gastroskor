import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';

import { RestaurantCard } from '@/components/RestaurantCard';
import { GastroColors } from '@/constants/theme';
import { formatFollowListRating } from '@/lib/sort-restaurants';
import type { RestaurantListItem } from '@/lib/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  restaurant: RestaurantListItem;
};

export function FollowingRestaurantAccordionRow({ restaurant }: Props) {
  const [open, setOpen] = useState(false);
  const ratingLabel = formatFollowListRating(restaurant);

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => !prev);
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        style={[styles.header, open && styles.headerOpen]}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${restaurant.name}, ${open ? 'kartı kapat' : 'kartı aç'}`}>
        <View style={styles.headerMain}>
          <Text style={styles.name} numberOfLines={2}>
            {restaurant.name}
          </Text>
          {ratingLabel ? <Text style={styles.ratingBadge}>{ratingLabel}</Text> : null}
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={GastroColors.muted}
        />
      </Pressable>
      {open ? (
        <View style={styles.body}>
          <RestaurantCard restaurant={restaurant} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.input,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerOpen: {
    borderBottomWidth: 1,
    borderBottomColor: GastroColors.border,
  },
  headerMain: { flex: 1, gap: 4 },
  name: { color: GastroColors.text, fontSize: 15, fontWeight: '700' },
  ratingBadge: {
    alignSelf: 'flex-start',
    color: GastroColors.gold,
    fontSize: 11,
    fontWeight: '600',
  },
  body: { padding: 8, paddingTop: 4 },
});
