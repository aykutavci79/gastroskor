import { StyleSheet, Text, View } from 'react-native';

import { GastroColorsOnlineOrder } from '@/constants/online-order-theme';

const ITEMS = ['Temiz arayüz', 'Doğrulanmış restoran', 'Min. 3.0 puan'] as const;

export function OnlineOrderTrustStrip() {
  return (
    <View style={styles.row}>
      {ITEMS.map((label) => (
        <View key={label} style={styles.chip}>
          <Text style={styles.chipText}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: GastroColorsOnlineOrder.border,
    backgroundColor: GastroColorsOnlineOrder.panel,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    color: GastroColorsOnlineOrder.muted,
    fontSize: 11,
    fontWeight: '600',
  },
});
