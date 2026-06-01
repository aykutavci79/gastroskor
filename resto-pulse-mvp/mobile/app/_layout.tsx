import 'react-native-gesture-handler';

import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { SessionProvider } from '@/context/session-context';
import { GastroColors } from '@/constants/theme';

WebBrowser.maybeCompleteAuthSession();

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
  return (
    <AppErrorBoundary>
      <SessionProvider>
        <ThemeProvider value={theme}>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: GastroColors.bg },
              headerTintColor: GastroColors.text,
              contentStyle: { backgroundColor: GastroColors.bg },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth/google" options={{ headerShown: false }} />
            <Stack.Screen name="restaurant/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="panel/claim" options={{ title: 'Mekan kaydi' }} />
          </Stack>
          <StatusBar style="light" />
        </ThemeProvider>
      </SessionProvider>
    </AppErrorBoundary>
  );
}
