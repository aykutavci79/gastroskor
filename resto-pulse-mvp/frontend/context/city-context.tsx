'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { DEFAULT_CITY, isKnownProvince, normalizeCityInput, resolveCityFromCoords } from '@/lib/turkiye-provinces';

export type CityDetectStatus = 'loading' | 'ready' | 'denied';

type CitySource = 'manual' | 'geo';

const STORAGE_CITY = 'gastroskor_city';
const STORAGE_SOURCE = 'gastroskor_city_source';

type CityContextValue = {
  city: string;
  setCity: (city: string) => void;
  status: CityDetectStatus;
  coords: { lat: number; lng: number } | null;
  refreshFromLocation: () => void;
  useMyLocation: () => void;
};

const CityContext = createContext<CityContextValue | null>(null);

function readStoredCity(): { city: string | null; source: CitySource | null } {
  if (typeof window === 'undefined') return { city: null, source: null };
  const raw = localStorage.getItem(STORAGE_CITY);
  const source = localStorage.getItem(STORAGE_SOURCE);
  if (!raw?.trim() || !isKnownProvince(raw)) return { city: null, source: null };
  return {
    city: normalizeCityInput(raw),
    source: source === 'manual' || source === 'geo' ? source : null,
  };
}

function persistCity(city: string, source: CitySource) {
  localStorage.setItem(STORAGE_CITY, normalizeCityInput(city));
  localStorage.setItem(STORAGE_SOURCE, source);
}

export function CityProvider({ children, defaultCity = DEFAULT_CITY }: { children: ReactNode; defaultCity?: string }) {
  const [city, setCityState] = useState(defaultCity);
  const [status, setStatus] = useState<CityDetectStatus>('loading');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const sourceRef = useRef<CitySource>('geo');
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    const stored = readStoredCity();
    if (stored.city) {
      setCityState(stored.city);
      sourceRef.current = stored.source ?? 'manual';
    }
    setStorageReady(true);
  }, []);

  const applyGeoResult = useCallback((latitude: number, longitude: number) => {
    setCoords({ lat: latitude, lng: longitude });
    const resolved = resolveCityFromCoords(latitude, longitude);
    if (sourceRef.current !== 'manual') {
      setCityState(resolved);
      persistCity(resolved, 'geo');
      sourceRef.current = 'geo';
    }
    setStatus('ready');
  }, []);

  const refreshFromLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => applyGeoResult(pos.coords.latitude, pos.coords.longitude),
      () => setStatus('denied'),
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 120_000 },
    );
  }, [applyGeoResult]);

  useEffect(() => {
    if (!storageReady) return;
    refreshFromLocation();
  }, [storageReady, refreshFromLocation]);

  const setCity = useCallback((next: string) => {
    if (!isKnownProvince(next)) return;
    const normalized = normalizeCityInput(next);
    sourceRef.current = 'manual';
    persistCity(normalized, 'manual');
    setCityState(normalized);
  }, []);

  const useMyLocation = useCallback(() => {
    sourceRef.current = 'geo';
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_SOURCE, 'geo');
    }
    refreshFromLocation();
  }, [refreshFromLocation]);

  return (
    <CityContext.Provider value={{ city, setCity, status, coords, refreshFromLocation, useMyLocation }}>
      {children}
    </CityContext.Provider>
  );
}

export function useDetectedCity(defaultCity = DEFAULT_CITY) {
  const ctx = useContext(CityContext);
  if (!ctx) {
    throw new Error('useDetectedCity CityProvider icinde kullanilmali.');
  }
  void defaultCity;
  return ctx;
}
