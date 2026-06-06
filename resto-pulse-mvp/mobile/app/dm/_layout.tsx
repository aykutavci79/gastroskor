import { Stack } from 'expo-router';

import { GastroColors } from '@/constants/theme';

export default function DmLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: GastroColors.bg },
        headerTintColor: GastroColors.text,
        contentStyle: { backgroundColor: GastroColors.bg },
      }}>
      <Stack.Screen name="inbox" options={{ title: 'Ozel mesajlar' }} />
      <Stack.Screen name="[threadId]" options={{ headerShown: false }} />
    </Stack>
  );
}
