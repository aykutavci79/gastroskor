import { Stack } from 'expo-router';

import { GastroColors } from '@/constants/theme';

export default function GurmeLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: GastroColors.bg },
        headerTintColor: GastroColors.text,
        contentStyle: { backgroundColor: GastroColors.bg },
      }}>
      <Stack.Screen name="[roomSlug]" options={{ headerShown: false }} />
      <Stack.Screen name="soru/[id]" options={{ title: 'Soru' }} />
    </Stack>
  );
}
