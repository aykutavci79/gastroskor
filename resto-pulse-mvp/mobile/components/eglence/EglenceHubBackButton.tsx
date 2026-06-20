import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  label?: string;
  color: string;
  fallbackHref?: Href;
};

/** Lobi header — geri tuşu yanında hedef (Eğlence). */
export function EglenceHubBackButton({ label = 'Eğlence', color, fallbackHref = '/(tabs)/eglence' }: Props) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace(fallbackHref);
      }}
      style={styles.wrap}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`${label} sekmesine dön`}>
      <Ionicons name="chevron-back" size={22} color={color} />
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    maxWidth: 160,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
});
