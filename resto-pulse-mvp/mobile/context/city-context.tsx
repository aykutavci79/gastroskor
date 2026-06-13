import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import {
  cityDisplayLabel,
  DEFAULT_CITY,
  normalizeCityInput,
  type SupportedCity,
} from '@/constants/supported-cities';
import { isCityManual, loadStoredCity, persistCity } from '@/lib/city-storage';
import { cityCenterCoords, resolveCityFromCoords } from '@/lib/resolve-city';
import { resolveDeviceCoords, type DeviceCoords } from '@/lib/device-location';

type CityContextValue = {
  city: SupportedCity;
  cityLabel: string;
  coords: DeviceCoords | null;
  loading: boolean;
  manual: boolean;
  setCity: (city: string, options?: { manual?: boolean }) => Promise<void>;
  refreshFromLocation: () => Promise<void>;
  fallbackCoords: DeviceCoords;
};

const CityContext = createContext<CityContextValue | null>(null);

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [city, setCityState] = useState<SupportedCity>(DEFAULT_CITY);
  const [coords, setCoords] = useState<DeviceCoords | null>(null);
  const [loading, setLoading] = useState(true);
  const [manual, setManual] = useState(false);

  const applyCity = useCallback(async (next: SupportedCity, isManual: boolean) => {
    setCityState(next);
    setManual(isManual);
    await persistCity(next, isManual);
  }, []);

  const syncCityFromLocation = useCallback(
    async (requestPermission = false): Promise<boolean> => {
      const resolved = await resolveDeviceCoords({ requestPermission });
      if (!resolved) return false;
      setCoords(resolved);
      await applyCity(resolveCityFromCoords(resolved.lat, resolved.lng), false);
      return true;
    },
    [applyCity],
  );

  const refreshFromLocation = useCallback(async () => {
    const ok = await syncCityFromLocation(false);
    if (!ok) await syncCityFromLocation(true);
  }, [syncCityFromLocation]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      try {
        const resolved = await resolveDeviceCoords({ requestPermission: true });
        if (!cancelled && resolved) {
          setCoords(resolved);
          const next = resolveCityFromCoords(resolved.lat, resolved.lng);
          setCityState(next);
          setManual(false);
          await persistCity(next, false);
        } else if (!cancelled) {
          const stored = await loadStoredCity();
          if (stored) {
            setCityState(stored);
            setManual(await isCityManual());
          }
        }

        if (!cancelled) {
          const cached = await resolveDeviceCoords({ requestPermission: false });
          if (cached) setCoords(cached);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncCityFromLocation(false);
    });
    return () => sub.remove();
  }, [syncCityFromLocation]);

  const setCity = useCallback(
    async (value: string, options?: { manual?: boolean }) => {
      const next = normalizeCityInput(value);
      await applyCity(next, options?.manual ?? true);
    },
    [applyCity],
  );

  const value = useMemo<CityContextValue>(
    () => ({
      city,
      cityLabel: cityDisplayLabel(city),
      coords,
      loading,
      manual,
      setCity,
      refreshFromLocation,
      fallbackCoords: cityCenterCoords(city),
    }),
    [city, coords, loading, manual, refreshFromLocation, setCity],
  );

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

export function useCity(): CityContextValue {
  const ctx = useContext(CityContext);
  if (!ctx) {
    throw new Error('useCity must be used within CityProvider');
  }
  return ctx;
}
