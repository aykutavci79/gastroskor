import { StyleSheet, Text, View } from 'react-native';

import { GastroColors } from '@/constants/theme';
import { ensureArray } from '@/lib/ensure-array';
import { formatPriceTl } from '@/lib/format-price-tl';
import type { RestaurantMenuItem } from '@/lib/types';

type Props = {
  items: RestaurantMenuItem[];
  totalCount?: number;
};

export function RestaurantMenuPreview({ items, totalCount }: Props) {
  const safeItems = ensureArray<RestaurantMenuItem>(items);
  if (!safeItems.length) return null;

  const preview = safeItems.slice(0, 2);
  const more =
    (totalCount ?? safeItems.length) > preview.length
      ? (totalCount ?? safeItems.length) - preview.length
      : 0;

  return (
    <View style={styles.wrap}>
      {preview.map((item) => (
        <View key={item.id} style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.price}>{formatPriceTl(item.price_tl, 0) ?? '—'} TL</Text>
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
