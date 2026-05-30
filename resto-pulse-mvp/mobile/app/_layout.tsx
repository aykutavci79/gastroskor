import 'react-native-gesture-handler';

import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SessionProvider } from '@/context/session-context';
import { GastroColors } from '@/constants/theme';

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
    <SessionProvider>
      <ThemeProvider value={theme}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: GastroColors.bg },
            headerTintColor: GastroColors.text,
            contentStyle: { backgroundColor: GastroColors.bg },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="restaurant/[id]" options={{ title: 'Restoran' }} />
          <Stack.Screen name="panel/claim" options={{ title: 'Mekan kaydi' }} />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </SessionProvider>
  );
}
