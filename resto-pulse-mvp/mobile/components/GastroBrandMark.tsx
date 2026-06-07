import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { GastroColors } from '@/constants/theme';

const LOGO = require('@/assets/logo.png');

type Props = {
  size?: 'sm' | 'md';
  showTagline?: boolean;
};

export function GastroBrandMark({ size = 'md', showTagline = false }: Props) {
  const logoSize = size === 'sm' ? 40 : 32;
  const wordSize = size === 'sm' ? 18 : 17;

  return (
    <View style={styles.row}>
      <Image source={LOGO} style={{ width: logoSize, height: logoSize }} contentFit="contain" />
      <View style={styles.copy}>
        <Text style={[styles.wordmark, { fontSize: wordSize }]}>
          Gastro<Text style={styles.accent}>Skor</Text>
        </Text>
        {showTagline ? <Text style={styles.tagline}>Tek Tıkla Gastro</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  copy: { gap: 1 },
  wordmark: { color: GastroColors.text, fontWeight: '800', letterSpacing: -0.3 },
  accent: { color: GastroColors.accent },
  tagline: { color: GastroColors.muted, fontSize: 11, fontWeight: '600' },
});
