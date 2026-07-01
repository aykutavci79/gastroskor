import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ReservationAmbienceHost } from '@/components/reservation/ReservationAmbienceHost';
import { ReservationTheme } from '@/constants/reservation-theme';

export default function OnlineRezervasyonLayout() {
  const { t } = useTranslation();
  return (
    <>
      <ReservationAmbienceHost />
      <Stack
      screenOptions={{
        headerStyle: { backgroundColor: ReservationTheme.bg },
        headerTintColor: ReservationTheme.text,
        headerBackTitle: t('rezervasyon.back'),
        contentStyle: { backgroundColor: ReservationTheme.bg },
      }}>
      <Stack.Screen name="masa/[restaurantId]" options={{ title: t('rezervasyon.selectTable') }} />
      <Stack.Screen name="[id]" options={{ title: t('rezervasyon.title') }} />
      </Stack>
    </>
  );
}
