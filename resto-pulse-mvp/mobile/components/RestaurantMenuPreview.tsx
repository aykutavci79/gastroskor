import { StyleSheet, Text, View } from 'react-native';

import { GastroColors } from '@/constants/theme';
import type { RestaurantMenuItem } from '@/lib/types';

type Props = {
  items: RestaurantMenuItem[];
  totalCount?: number;
};

export function RestaurantMenuPreview({ items, totalCount }: Props) {
  if (!items.length) return null;

  const preview = items.slice(0, 2);
  const more =
    (totalCount ?? items.length) > preview.length
      ? (totalCount ?? items.length) - preview.length
      : 0;

  return (
    <View style={styles.wrap}>
      {preview.map((item) => (
        <View key={item.id} style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.price}>{item.price_tl.toFixed(0)} TL</Text>
        </View>
      ))}
      {more > 0 ? <Text style={styles.more}>+{more} ürün daha</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, color: GastroColors.muted, fontSize: 11 },
  price: { color: GastroColors.gold, fontSize: 11, fontWeight: '700' },
  more: { color: GastroColors.muted, fontSize: 10 },
});
