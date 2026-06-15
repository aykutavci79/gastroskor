import { StyleSheet, Text, View } from 'react-native';

import { getCityAtmosphere } from '@/lib/city-atmosphere';

type Props = {
  city: string;
  statusLine?: string;
};

export function CityAtmosphereStrip({ city, statusLine = 'Konumuna göre' }: Props) {
  const theme = getCityAtmosphere(city);
  const palette = theme.darkStrip;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: palette.background,
          borderColor: `${theme.darkStrip.accent}44`,
        },
      ]}
      accessibilityLabel={`${theme.label} atmosfer şeridi`}>
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={[styles.dot, { backgroundColor: palette.accent }]} />
          <Text style={[styles.city, { color: palette.text }]} numberOfLines={1}>
            {theme.label}
          </Text>
          <Text style={[styles.status, { color: theme.darkStrip.muted }]} numberOfLines={1}>
            {statusLine}
          </Text>
        </View>
        <Text style={[styles.hint, { color: theme.darkStrip.muted }]} numberOfLines={1}>
          {theme.hint}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  city: {
    fontSize: 13,
    fontWeight: '800',
  },
  status: {
    fontSize: 10,
    fontWeight: '600',
  },
  hint: {
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'right',
    maxWidth: '46%',
  },
});
