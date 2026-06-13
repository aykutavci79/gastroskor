import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalizeCityInput, type SupportedCity } from '@/constants/supported-cities';

const CITY_KEY = 'gs_active_city';
const CITY_MANUAL_KEY = 'gs_active_city_manual';

export async function loadStoredCity(): Promise<SupportedCity | null> {
  const raw = await AsyncStorage.getItem(CITY_KEY);
  if (!raw?.trim()) return null;
  return normalizeCityInput(raw);
}

export async function isCityManual(): Promise<boolean> {
  return (await AsyncStorage.getItem(CITY_MANUAL_KEY)) === 'true';
}

export async function persistCity(city: SupportedCity, manual: boolean): Promise<void> {
  await AsyncStorage.multiSet([
    [CITY_KEY, city],
    [CITY_MANUAL_KEY, manual ? 'true' : 'false'],
  ]);
}

export async function clearStoredCity(): Promise<void> {
  await AsyncStorage.multiRemove([CITY_KEY, CITY_MANUAL_KEY]);
}
