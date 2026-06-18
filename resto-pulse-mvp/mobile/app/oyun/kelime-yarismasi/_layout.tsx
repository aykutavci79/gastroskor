import { Stack } from 'expo-router';

import { useGastroTheme } from '@/context/theme-context';

export default function KelimeYarismasiLayout() {
  const { colors } = useGastroTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.bg },
        headerBackTitle: 'Geri',
      }}>
      <Stack.Screen name="index" options={{ title: 'Kelime Yarışması' }} />
      <Stack.Screen name="oyun" options={{ title: 'Oyun', headerBackVisible: false }} />
      <Stack.Screen name="sonuc" options={{ title: 'Sonuç', headerBackVisible: false }} />
    </Stack>
  );
}
