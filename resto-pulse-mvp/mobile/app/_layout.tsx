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
import { useTranslation } from 'react-i18next';
import { KeyboardRoot } from '@/lib/KeyboardRoot';

import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { GastroAnimatedSplash } from '@/components/GastroAnimatedSplash';
import { gastroCoinStackHeaderTitle } from '@/components/GastroCoinHeaderTitle';
import { AppMetricsTracker } from '@/components/AppMetricsTracker';
import { NotificationBootstrap } from '@/components/NotificationBootstrap';
import { CityProvider } from '@/context/city-context';
import { GastroThemeProvider, useGastroTheme } from '@/context/theme-context';
import { SessionProvider } from '@/context/session-context';
import { createSentryBeforeSend } from '@/lib/sentry-scrub';
import { GastroPostHogRoot } from '@/lib/GastroPostHogRoot';
import { registerSslPinningErrorListener, setupSslPinning } from '@/lib/ssl-pinning';
import { initI18n } from '@/lib/i18n';

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    enabled: !__DEV__,
    sendDefaultPii: false,
    tracesSampleRate: 0.2,
    beforeSend: createSentryBeforeSend(),
  });
}

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function NavigationShell() {
  const { colors } = useGastroTheme();
  const { t } = useTranslation();

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
          options={{ headerShown: false, headerBackTitle: t('nav.back'), title: t('nav.explore') }}
        />
        <Stack.Screen name="restaurant/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="restaurants/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="place/[placeId]" options={{ headerShown: false }} />
        <Stack.Screen name="gurme" options={{ headerShown: false }} />
        <Stack.Screen name="dm" options={{ headerShown: false }} />
        <Stack.Screen name="yoresel/index" options={{ title: t('nav.localCuisines') }} />
        <Stack.Screen name="yoresel/[slug]" options={{ title: t('nav.cuisineDetail') }} />
        <Stack.Screen name="foodcast/index" options={{ headerShown: false }} />
        <Stack.Screen name="foodcast/paylas" options={{ title: t('nav.shareADish') }} />
        <Stack.Screen name="panel/claim" options={{ title: t('nav.venueClaim') }} />
        <Stack.Screen
          name="siparis-acik"
          options={{
            headerTitle: gastroCoinStackHeaderTitle(t('order.title'), 'light'),
            headerBackTitle: t('nav.back'),
            headerBackVisible: true,
          }}
        />
        <Stack.Screen
          name="siparis-acik-sonuclar"
          options={{
            headerTitle: gastroCoinStackHeaderTitle(t('order.results'), 'light'),
            headerBackTitle: t('nav.back'),
            headerBackVisible: true,
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTintColor: '#141414',
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="rezervasyon-acik"
          options={{
            title: t('reservation.title'),
            headerBackTitle: t('nav.back'),
            headerBackVisible: true,
            headerStyle: { backgroundColor: '#14080f' },
            headerTintColor: '#FFF8F0',
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen name="online-rezervasyon" options={{ headerShown: false }} />
        <Stack.Screen
          name="online-siparis/[id]"
          options={{
            headerTitle: gastroCoinStackHeaderTitle(t('order.label'), 'light'),
            headerBackTitle: t('nav.back'),
            headerBackVisible: true,
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTintColor: '#141414',
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="hesap/siparis-bilgileri"
          options={{
            headerTitle: gastroCoinStackHeaderTitle(t('order.phoneAndAddress'), 'light'),
            headerBackTitle: t('nav.back'),
            headerBackVisible: true,
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTintColor: '#141414',
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="siparislerim"
          options={{
            headerTitle: gastroCoinStackHeaderTitle(t('nav.myOrders')),
            headerBackTitle: t('nav.back'),
            headerBackVisible: true,
          }}
        />
        <Stack.Screen
          name="yorumlarim"
          options={{
            title: t('nav.myReviews'),
            headerBackTitle: t('nav.back'),
            headerBackVisible: true,
          }}
        />
        <Stack.Screen
          name="siparis/[id]"
          options={{
            headerTitle: gastroCoinStackHeaderTitle(t('order.detail')),
            headerBackTitle: t('nav.back'),
            headerBackVisible: true,
          }}
        />
        <Stack.Screen name="oyun/kelime-sofrasi" options={{ headerShown: false }} />
        <Stack.Screen name="oyun/mini-sudoku" options={{ headerShown: false }} />
        <Stack.Screen name="oyun/gunluk-kelime" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
    SofraMontserratBlack: require('../assets/fonts/Montserrat-Black.ttf'),
  });
  const [splashDone, setSplashDone] = useState(false);
  const [i18nReady, setI18nReady] = useState(false);

  const handleSplashFinish = useCallback(() => {
    setSplashDone(true);
  }, []);

  useEffect(() => {
    if (!splashDone) return;
    void import('@/lib/gastro-lexicon-preload').then((m) => m.startBackgroundLexiconPreload());
  }, [splashDone]);

  useEffect(() => {
    void initI18n().then(() => setI18nReady(true));
  }, []);

  useEffect(() => {
    const removePinningListener = registerSslPinningErrorListener();
    void setupSslPinning();
    return removePinningListener;
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && i18nReady) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, fontError, i18nReady]);

  if ((!fontsLoaded && !fontError) || !i18nReady) {
    return null;
  }

  const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_KEY?.trim();
  const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim();

  const appTree = !splashDone ? (
    <AppErrorBoundary>
      <View style={splashGateStyles.gate}>
        <GastroAnimatedSplash onFinish={handleSplashFinish} />
      </View>
    </AppErrorBoundary>
  ) : (
    <AppErrorBoundary>
      <KeyboardRoot>
        <SessionProvider>
          <GastroThemeProvider>
            <CityProvider>
              <AppMetricsTracker />
              <NotificationBootstrap />
              <NavigationShell />
            </CityProvider>
          </GastroThemeProvider>
        </SessionProvider>
      </KeyboardRoot>
    </AppErrorBoundary>
  );

  return (
    <GastroPostHogRoot apiKey={posthogKey} host={posthogHost}>
      {appTree}
    </GastroPostHogRoot>
  );
}

export default sentryDsn ? Sentry.wrap(RootLayout) : RootLayout;

const splashGateStyles = StyleSheet.create({
  gate: {
    flex: 1,
    backgroundColor: '#141414',
  },
});
