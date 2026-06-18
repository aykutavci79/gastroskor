import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { GastroColors } from '@/constants/theme';
import { exitDmScreen } from '@/lib/dm-navigation';

export function DmHeaderBack() {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => exitDmScreen(router)}
      hitSlop={12}
      style={styles.hit}
      accessibilityRole="button"
      accessibilityLabel="Geri">
      <Ionicons name="chevron-back" size={26} color={GastroColors.accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    marginLeft: Platform.select({ ios: -4, default: 0 }),
    paddingRight: 4,
    paddingVertical: 4,
  },
});
