import { Stack } from 'expo-router';

import { ReservationTheme } from '@/constants/reservation-theme';

export default function OnlineRezervasyonLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: ReservationTheme.bg },
        headerTintColor: ReservationTheme.text,
        headerBackTitle: 'Geri',
        contentStyle: { backgroundColor: ReservationTheme.bg },
      }}>
      <Stack.Screen name="masa/[restaurantId]" options={{ title: 'Masa sec' }} />
      <Stack.Screen name="[id]" options={{ title: 'Rezervasyon' }} />
    </Stack>
  );
}
