import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { LEGAL_URLS } from '@/constants/legal';
import { GastroColors } from '@/constants/theme';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function KvkkConsentCheckbox({ checked, onChange }: Props) {
  return (
    <Pressable style={styles.row} onPress={() => onChange(!checked)} accessibilityRole="checkbox" accessibilityState={{ checked }}>
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked ? <Text style={styles.tick}>✓</Text> : null}
      </View>
      <Text style={styles.text}>
        <Text style={styles.link} onPress={() => void Linking.openURL(LEGAL_URLS.kvkk)}>
          KVKK aydınlatma metnini
        </Text>{' '}
        okudum; kişisel verilerimin işlenmesine{' '}
        <Text style={styles.link} onPress={() => void Linking.openURL(LEGAL_URLS.privacy)}>
          gizlilik politikası
        </Text>{' '}
        kapsamında açık rıza veriyorum.
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: GastroColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  boxOn: {
    backgroundColor: GastroColors.accent,
    borderColor: GastroColors.accent,
  },
  tick: { color: '#141414', fontSize: 14, fontWeight: '800', lineHeight: 16 },
  text: { flex: 1, color: GastroColors.muted, fontSize: 12, lineHeight: 18 },
  link: { color: GastroColors.accent, fontWeight: '700' },
});
