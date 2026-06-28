import { Stack } from 'expo-router';

export default function OnlineRezervasyonLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#fff',
        headerBackTitle: 'Geri',
        contentStyle: { backgroundColor: '#0f172a' },
      }}>
      <Stack.Screen name="masa/[restaurantId]" options={{ title: 'Masa sec' }} />
      <Stack.Screen name="[id]" options={{ title: 'Rezervasyon' }} />
    </Stack>
  );
}
