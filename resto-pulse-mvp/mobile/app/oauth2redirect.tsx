import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { GastroColors } from '@/constants/theme';

/** Google native OAuth geri donusu — Expo Router "Unmatched Route" olmasin diye. */
export default function GoogleOAuthRedirectScreen() {
  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
    const timer = setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/profil');
      }
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={GastroColors.accent} size="large" />
      <Text style={styles.text}>Google girisi tamamlanıyor…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: GastroColors.bg,
    gap: 12,
    padding: 24,
  },
  text: { color: GastroColors.muted, fontSize: 14 },
});
