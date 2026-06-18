import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useGastroTheme } from '@/context/theme-context';

type Props = {
  harfler: string[];
  kucuk?: boolean;
};

export function KelimeYarismasiHarfKutulari({ harfler, kucuk }: Props) {
  const { colors } = useGastroTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        satir: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 6,
        },
        kutu: {
          minWidth: kucuk ? 28 : 36,
          height: kucuk ? 36 : 44,
          borderRadius: 8,
          backgroundColor: colors.input,
          borderWidth: 2,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 4,
        },
        harf: {
          fontSize: kucuk ? 16 : 20,
          fontWeight: '700',
          color: colors.text,
          letterSpacing: 1,
        },
      }),
    [colors, kucuk],
  );

  return (
    <View style={styles.satir}>
      {harfler.map((h, i) => (
        <View key={`${i}-${h}`} style={styles.kutu}>
          <Text style={styles.harf}>{h === '_' ? '·' : h}</Text>
        </View>
      ))}
    </View>
  );
}
