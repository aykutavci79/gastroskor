import { StyleSheet, Text, View } from 'react-native';

import { GastroColors } from '@/constants/theme';
import type { GeoIndication } from '@/lib/types';

type Props = {
  hasGeographicalIndication: boolean;
  giProductName: string | null;
  geoIndications?: GeoIndication[];
};

function productLabels({
  hasGeographicalIndication,
  giProductName,
  geoIndications = [],
}: Props): string[] {
  const fromJson = geoIndications.map((item) => item.product).filter(Boolean);
  if (fromJson.length > 0) return fromJson;
  if (hasGeographicalIndication && giProductName) return [giProductName];
  return [];
}

export function MahrecBadge(props: Props) {
  const products = productLabels(props);
  if (!props.hasGeographicalIndication && products.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {products.map((product) => (
        <View key={product} style={styles.badge}>
          <Text style={styles.label}>MAHREÇ</Text>
          <Text style={styles.product} numberOfLines={1}>
            {product}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  badge: {
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.45)',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: GastroColors.gold,
  },
  product: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FDE68A',
    marginTop: 1,
  },
});
