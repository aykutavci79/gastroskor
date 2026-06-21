import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RestaurantPublicMenu } from '@/components/RestaurantPublicMenu';
import { GastroColors } from '@/constants/theme';
import {
  restaurantMenuItems,
  type MenuCarrier,
} from '@/lib/restaurant-menu';
import type { RestaurantMenuItem } from '@/lib/types';

type Props = {
  restaurant: MenuCarrier & { name: string };
  /** Tam liste; karttan gelindiyse API'den gelen menu tercih edilir */
  menuOverride?: RestaurantMenuItem[];
};

export function RestaurantMenuBlock({ restaurant, menuOverride }: Props) {
  const items = menuOverride?.length ? menuOverride : restaurantMenuItems(restaurant);
  const structured = items.length > 0;
  const photoUrl = restaurant.promo?.menu_image_url?.trim() || null;
  const showPhoto = Boolean(photoUrl) && !structured;

  if (!structured && !showPhoto) return null;

  return (
    <View style={styles.wrap}>
      {structured ? (
        <RestaurantPublicMenu items={items} restaurantName={restaurant.name} />
      ) : null}
      {showPhoto && photoUrl ? (
        <View style={styles.photoCard}>
          <Text style={styles.photoTitle}>Menü fotoğrafı</Text>
          <Pressable onPress={() => void Linking.openURL(photoUrl)}>
            <Image source={{ uri: photoUrl }} style={styles.photo} contentFit="contain" />
          </Pressable>
          <Text style={styles.photoHint}>Büyütmek için görsele dokun.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  photoCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    padding: 14,
    gap: 8,
  },
  photoTitle: { color: GastroColors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  photo: {
    width: '100%',
    minHeight: 180,
    maxHeight: 360,
    borderRadius: 12,
    backgroundColor: GastroColors.input,
  },
  photoHint: { color: GastroColors.muted, fontSize: 11 },
});
