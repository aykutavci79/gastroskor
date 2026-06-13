import { StyleSheet, Text } from 'react-native';

import { GastroColors } from '@/constants/theme';

type Props = {
  size?: 'sm' | 'md';
};

export function FoodCastTitle({ size = 'sm' }: Props) {
  const isMd = size === 'md';
  return (
    <Text style={[styles.title, isMd && styles.titleMd]}>
      <Text style={[styles.base, isMd && styles.baseMd]}>Food</Text>
      <Text style={[styles.accent, isMd && styles.accentMd]}>Cast</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '800' },
  titleMd: { fontSize: 22 },
  base: { color: GastroColors.text, fontSize: 14 },
  baseMd: { fontSize: 22 },
  accent: { color: GastroColors.accent, fontSize: 14 },
  accentMd: { fontSize: 22 },
});
