import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { GastroColorScheme } from '@/constants/theme';
import { useAppBadges } from '@/context/app-badges-context';
import { useGastroTheme } from '@/context/theme-context';

type Props = {
  size?: number;
};

export function OrdersHeaderButton({ size = 36 }: Props) {
  const router = useRouter();
  const { ordersPending } = useAppBadges();
  const { colors } = useGastroTheme();
  const styles = useMemo(() => createStyles(colors, size), [colors, size]);

  function openOrders() {
    router.push('/siparislerim' as never);
  }

  const badgeLabel = ordersPending > 9 ? '9+' : String(ordersPending);

  return (
    <Pressable
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
      onPress={openOrders}
      accessibilityLabel="Siparislerim"
      hitSlop={8}>
      <View style={styles.iconShell}>
        <Ionicons name="receipt-outline" size={Math.round(size * 0.52)} color={colors.text} />
      </View>
      {ordersPending > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function createStyles(colors: GastroColorScheme, size: number) {
  return StyleSheet.create({
    wrap: { position: 'relative' },
    pressed: { opacity: 0.85 },
    iconShell: {
      width: size,
      height: size,
      borderRadius: size / 2,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.bg,
    },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  });
}
