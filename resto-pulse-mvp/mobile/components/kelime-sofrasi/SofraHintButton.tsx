import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SOFRA_GLASS_BG, SOFRA_GLASS_BORDER, SOFRA_LETTER_COLOR } from '@/constants/kelime-sofrasi';
import { useGastroTheme } from '@/context/theme-context';

type Props = {
  hintsLeft: number;
  onPress: () => void;
  disabled?: boolean;
};

const SIZE = 58;

export function SofraHintButton({ hintsLeft, onPress, disabled }: Props) {
  const { colors } = useGastroTheme();
  const inactive = disabled || hintsLeft <= 0;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          alignItems: 'center',
          backgroundColor: SOFRA_GLASS_BG,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: SOFRA_GLASS_BORDER,
          paddingHorizontal: 8,
          paddingTop: 6,
          paddingBottom: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.12,
          shadowRadius: 3,
          elevation: 3,
          opacity: inactive ? 0.55 : 1,
        },
        ring: {
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          borderWidth: 1.5,
          borderColor: SOFRA_GLASS_BORDER,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.88)',
        },
        label: {
          marginTop: 4,
          fontSize: 11,
          fontWeight: '800',
          color: SOFRA_LETTER_COLOR,
          textAlign: 'center',
        },
      }),
    [inactive],
  );

  return (
    <Pressable
      style={styles.root}
      onPress={() => {
        if (inactive) return;
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={`İpucu, ${hintsLeft} kaldı`}>
      <View style={styles.ring}>
        <Ionicons
          name="bulb-outline"
          size={28}
          color={inactive ? colors.muted : SOFRA_LETTER_COLOR}
        />
      </View>
      <Text style={styles.label}>İpucu{hintsLeft > 0 ? ` (${hintsLeft})` : ''}</Text>
    </Pressable>
  );
}
