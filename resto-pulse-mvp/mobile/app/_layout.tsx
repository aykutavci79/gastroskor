import 'react-native-gesture-handler';

import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { GastroAnimatedSplash } from '@/components/GastroAnimatedSplash';
import { AppMetricsTracker } from '@/components/AppMetricsTracker';
import { NotificationBootstrap } from '@/components/NotificationBootstrap';
import { CityProvider } from '@/context/city-context';
import { GastroThemeProvider, useGastroTheme } from '@/context/theme-context';
import { SessionProvider } from '@/context/session-context';
import { setupSslPinning } from '@/lib/ssl-pinning';

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    enabled: !__DEV__,
    tracesSampleRate: 0.2,
  });
}

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function NavigationShell() {
  const { colors } = useGastroTheme();

  const navTheme = useMemo(
    () => ({
      ...DarkTheme,
      colors: {
        ...DarkTheme.colors,
        background: colors.bg,
        card: colors.panel,
        primary: colors.accent,
        text: colors.text,
        border: colors.border,
      },
    }),
    [colors],
  );

  return (
    <ThemeProvider value={navTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false, headerBackTitle: 'Geri', title: 'Keşfet' }}
        />
        <Stack.Screen name="restaurant/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="restaurants/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="place/[placeId]" options={{ headerShown: false }} />
        <Stack.Screen name="gurme" options={{ headerShown: false }} />
        <Stack.Screen name="dm" options={{ headerShown: false }} />
        <Stack.Screen name="yoresel/index" options={{ title: 'Yöresel lezzetler' }} />
        <Stack.Screen name="yoresel/[slug]" options={{ title: 'Lezzet detayı' }} />
        <Stack.Screen name="foodcast/index" options={{ headerShown: false }} />
        <Stack.Screen name="foodcast/paylas" options={{ title: 'Tabak paylaş' }} />
        <Stack.Screen name="panel/claim" options={{ title: 'Mekan kaydi' }} />
        <Stack.Screen
          name="siparis-acik"
          options={{
            title: 'Online Sipariş',
            headerBackTitle: 'Geri',
            headerBackVisible: true,
          }}
        />
        <Stack.Screen
          name="siparis-acik-sonuclar"
          options={{
            title: 'Sonuçlar',
            headerBackTitle: 'Geri',
            headerBackVisible: true,
          }}
        />
        <Stack.Screen
          name="siparislerim"
          options={{
            title: 'Siparişlerim',
            headerBackTitle: 'Geri',
            headerBackVisible: true,
          }}
        />
        <Stack.Screen
          name="siparis/[id]"
          options={{
            title: 'Sipariş detayı',
            headerBackTitle: 'Geri',
            headerBackVisible: true,
          }}
        />
        <Stack.Screen name="oyun/kelime-sofrasi" options={{ headerShown: false }} />
        <Stack.Screen name="oyun/mini-sudoku" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });
  const [splashDone, setSplashDone] = useState(false);

  const handleSplashFinish = useCallback(() => {
    setSplashDone(true);
  }, []);

  useEffect(() => {
    void setupSslPinning();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (!splashDone) {
    return (
      <AppErrorBoundary>
        <View style={splashGateStyles.gate}>
          <GastroAnimatedSplash onFinish={handleSplashFinish} />
        </View>
      </AppErrorBoundary>
    );
  }

  return (
    <AppErrorBoundary>
      <KeyboardProvider>
        <SessionProvider>
          <GastroThemeProvider>
            <CityProvider>
              <AppMetricsTracker />
              <NotificationBootstrap />
              <NavigationShell />
            </CityProvider>
          </GastroThemeProvider>
        </SessionProvider>
      </KeyboardProvider>
    </AppErrorBoundary>
  );
}

export default sentryDsn ? Sentry.wrap(RootLayout) : RootLayout;

const splashGateStyles = StyleSheet.create({
  gate: {
    flex: 1,
    backgroundColor: '#141414',
  },
});
