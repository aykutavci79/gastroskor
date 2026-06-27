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
      <Text style={styles.legend}>Arama modeli</Text>
      <View style={styles.row}>
        <Pressable
          style={[styles.option, value === 'gastroskor' && styles.optionOn]}
          onPress={() => onChange('gastroskor')}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === 'gastroskor' }}>
          <Text style={[styles.optionTitle, value === 'gastroskor' && styles.optionTitleOn]}>
            GastroSkor
          </Text>
          <Text style={styles.optionSub}>Google skoru, mesafe, yorum</Text>
        </Pressable>
        <Pressable
          style={[styles.option, value === 'sosyal' && styles.optionOn, !canRunSocial && styles.optionMuted]}
          onPress={() => onChange('sosyal')}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === 'sosyal' }}>
          <Text style={[styles.optionTitle, value === 'sosyal' && styles.optionTitleOn]}>
            Sosyal kanıt
          </Text>
          <Text style={styles.optionSub}>
            {canRunSocial ? 'Reddit / X / YouTube' : 'Giriş gerekir'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: GastroColorScheme) {
  return StyleSheet.create({
    wrap: { gap: 8 },
    legend: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    row: {
      flexDirection: 'row',
      gap: 8,
    },
    option: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      paddingHorizontal: 10,
      paddingVertical: 10,
      gap: 2,
    },
    optionOn: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    optionMuted: {
      opacity: 0.92,
    },
    optionTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    optionTitleOn: {
      color: colors.accent,
    },
    optionSub: {
      color: colors.muted,
      fontSize: 10,
      lineHeight: 14,
    },
  });
}
