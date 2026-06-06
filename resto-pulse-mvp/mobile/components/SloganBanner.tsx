import { StyleSheet, Text, View } from 'react-native';

import { GastroColors } from '@/constants/theme';

export function SloganBanner() {
  return (
    <View style={styles.banner}>
      <Text style={styles.main}>Türkiye&apos;nin Restoranları</Text>
      <Text style={styles.sub}>
        Tek Tıkla <Text style={styles.gastro}>Gastro</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
    borderColor: GastroColors.accent,
    shadowColor: GastroColors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  main: { color: GastroColors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  sub: { color: GastroColors.muted, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  gastro: { color: GastroColors.accent, fontWeight: '800' },
});
