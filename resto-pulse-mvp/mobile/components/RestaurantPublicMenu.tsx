import { StyleSheet, Text, View } from 'react-native';

import { GastroColors } from '@/constants/theme';
import { ensureArray } from '@/lib/ensure-array';
import { formatPriceTl } from '@/lib/format-price-tl';
import type { RestaurantMenuItem } from '@/lib/types';

type Props = {
  items: RestaurantMenuItem[];
  restaurantName?: string;
};

export function RestaurantPublicMenu({ items, restaurantName }: Props) {
  const rows = ensureArray<RestaurantMenuItem>(items);
  if (!rows.length) return null;

  const byCategory = rows.reduce<Record<string, RestaurantMenuItem[]>>((acc, item) => {
    const key = item.category?.trim() || 'Menü';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Menü ve fiyatlar</Text>
      <Text style={styles.sub}>
        {restaurantName ? `${restaurantName} · ` : ''}İşletme tarafından girildi
      </Text>
      <View style={styles.groups}>
        {Object.entries(byCategory).map(([category, rows]) => (
          <View key={category} style={styles.group}>
            <Text style={styles.category}>{category}</Text>
            {rows.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemCopy}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.description ? (
                    <Text style={styles.itemDesc}>{item.description}</Text>
                  ) : null}
                </View>
                <Text style={styles.itemPrice}>{formatPriceTl(item.price_tl, 2) ?? '—'} TL</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 183, 3, 0.35)',
    backgroundColor: 'rgba(255, 183, 3, 0.08)',
    padding: 16,
    gap: 8,
  },
  title: { color: GastroColors.gold, fontSize: 17, fontWeight: '800' },
  sub: { color: GastroColors.muted, fontSize: 11, lineHeight: 16 },
  groups: { gap: 14, marginTop: 4 },
  group: { gap: 0 },
  category: {
    color: GastroColors.gold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: GastroColors.border,
  },
  itemCopy: { flex: 1, gap: 2 },
  itemName: { color: GastroColors.text, fontSize: 14, fontWeight: '600' },
  itemDesc: { color: GastroColors.muted, fontSize: 12, lineHeight: 17 },
  itemPrice: { color: GastroColors.gold, fontSize: 14, fontWeight: '800' },
});
