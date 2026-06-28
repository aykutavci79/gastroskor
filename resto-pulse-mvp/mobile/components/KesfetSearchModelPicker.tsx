import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { GastroColorScheme } from '@/constants/theme';
import { useGastroTheme } from '@/context/theme-context';

export type KesfetSearchModel = 'gastroskor' | 'sosyal';

type Props = {
  value: KesfetSearchModel;
  onChange: (value: KesfetSearchModel) => void;
  canRunSocial: boolean;
};

export function KesfetSearchModelPicker({ value, onChange, canRunSocial }: Props) {
  const { colors } = useGastroTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.wrap}>
      <Pressable
        style={[styles.chip, value === 'gastroskor' && styles.chipOn]}
        onPress={() => onChange('gastroskor')}
        accessibilityRole="radio"
        accessibilityState={{ selected: value === 'gastroskor' }}
        accessibilityLabel="GastroSkor araması, Google skoru ve mesafe">
        <Text style={[styles.chipText, value === 'gastroskor' && styles.chipTextOn]}>GastroSkor</Text>
      </Pressable>
      <Pressable
        style={[
          styles.chip,
          value === 'sosyal' && styles.chipOn,
          !canRunSocial && styles.chipMuted,
        ]}
        onPress={() => onChange('sosyal')}
        accessibilityRole="radio"
        accessibilityState={{ selected: value === 'sosyal' }}
        accessibilityLabel={
          canRunSocial ? 'Sosyal kanıt araması' : 'Sosyal kanıt, giriş gerekir'
        }>
        <Text style={[styles.chipText, value === 'sosyal' && styles.chipTextOn]}>Sosyal</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: GastroColorScheme) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignSelf: 'flex-start',
      gap: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      padding: 3,
    },
    chip: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    chipOn: {
      backgroundColor: colors.accentSoft,
    },
    chipMuted: {
      opacity: 0.55,
    },
    chipText: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '700',
    },
    chipTextOn: {
      color: colors.accent,
      fontWeight: '800',
    },
  });
}
