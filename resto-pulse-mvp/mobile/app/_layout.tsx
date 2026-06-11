import 'react-native-gesture-handler';

import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { AppMetricsTracker } from '@/components/AppMetricsTracker';
import { NotificationBootstrap } from '@/components/NotificationBootstrap';
import { SessionProvider } from '@/context/session-context';
import { GastroColors } from '@/constants/theme';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: GastroColors.bg,
    card: GastroColors.panel,
    primary: GastroColors.accent,
    text: GastroColors.text,
    border: GastroColors.border,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AppErrorBoundary>
      <SessionProvider>
        <AppMetricsTracker />
        <NotificationBootstrap />
        <ThemeProvider value={theme}>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: GastroColors.bg },
              headerTintColor: GastroColors.text,
              contentStyle: { backgroundColor: GastroColors.bg },
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
            <Stack.Screen name="panel/claim" options={{ title: 'Mekan kaydi' }} />
            <Stack.Screen
              name="siparis-acik"
              options={{
                title: 'Online Sipariş',
                headerBackTitle: 'Geri',
                headerBackVisible: true,
              }}
            />
          </Stack>
          <StatusBar style="light" />
        </ThemeProvider>
      </SessionProvider>
    </AppErrorBoundary>
  );
}
