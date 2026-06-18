import { Stack } from 'expo-router';

import { useGastroTheme } from '@/context/theme-context';

export default function KelimeSofrasiLayout() {
  const { colors } = useGastroTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.bg },
        headerBackTitle: 'Geri',
      }}>
      <Stack.Screen name="index" options={{ title: 'Kelime Sofrası' }} />
      <Stack.Screen name="oyun" options={{ title: 'Sofra', headerBackTitle: 'Geri' }} />
    </Stack>
  );
}
