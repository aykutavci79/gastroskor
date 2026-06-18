import { Stack } from 'expo-router';

import { DmHeaderBack } from '@/components/dm/DmHeaderBack';
import { GastroColors } from '@/constants/theme';

export default function DmLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: GastroColors.bg },
        headerTintColor: GastroColors.accent,
        headerTitleStyle: { color: GastroColors.text, fontWeight: '800' },
        headerBackTitle: 'Geri',
        headerBackVisible: true,
        contentStyle: { backgroundColor: GastroColors.bg },
        animation: 'slide_from_right',
      }}>
      <Stack.Screen
        name="inbox"
        options={{
          title: 'Özel mesajlar',
          headerLeft: () => <DmHeaderBack />,
        }}
      />
      <Stack.Screen
        name="[threadId]"
        options={{
          title: 'Özel mesaj',
          headerBackTitle: 'Geri',
        }}
      />
    </Stack>
  );
}
