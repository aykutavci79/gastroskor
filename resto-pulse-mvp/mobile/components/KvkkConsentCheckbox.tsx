import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LEGAL_URLS } from '@/constants/legal';
import { GastroColors } from '@/constants/theme';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function KvkkConsentCheckbox({ checked, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <Pressable style={styles.row} onPress={() => onChange(!checked)} accessibilityRole="checkbox" accessibilityState={{ checked }}>
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked ? <Text style={styles.tick}>✓</Text> : null}
      </View>
      <Text style={styles.text}>
        <Text style={styles.link} onPress={() => void Linking.openURL(LEGAL_URLS.kvkk)}>
          {t('auth.kvkkLink')}
        </Text>{' '}
        {t('auth.kvkkConsentMid')}{' '}
        <Text style={styles.link} onPress={() => void Linking.openURL(LEGAL_URLS.privacy)}>
          {t('auth.kvkkPrivacyLink')}
        </Text>{' '}
        {t('auth.kvkkConsentEnd')}
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
