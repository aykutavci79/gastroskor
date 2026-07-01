import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  GastroColorsOnlineOrder,
  ONLINE_ORDER_PAGE_BG,
} from '@/constants/online-order-theme';
import { onlineOrderScreenHrefFromLegacySonuclar } from '@/lib/online-order-screen-route';

export default function OnlineOrderResultsRedirect() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const q = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value == null) continue;
      q.set(key, Array.isArray(value) ? (value[0] ?? '') : String(value));
    }
    const href = onlineOrderScreenHrefFromLegacySonuclar(q.toString());
    router.replace(href);
  }, [params, router]);

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ActivityIndicator color={GastroColorsOnlineOrder.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ONLINE_ORDER_PAGE_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
