import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  gastroColorsFor,
  gastroShadowFor,
  type GastroColorScheme,
  type GastroShadowScheme,
  type GastroThemeMode,
} from '@/constants/theme';

const STORAGE_KEY = 'gastroskor-theme';

type ThemeContextValue = {
  mode: GastroThemeMode;
  colors: GastroColorScheme;
  shadow: GastroShadowScheme;
  ready: boolean;
  setMode: (mode: GastroThemeMode) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function GastroThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<GastroThemeMode>('dark');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        if (raw === 'light' || raw === 'dark') setModeState(raw);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: GastroThemeMode) => {
    setModeState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'light' ? 'dark' : 'light');
  }, [mode, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      colors: gastroColorsFor(mode),
      shadow: gastroShadowFor(mode),
      ready,
      setMode,
      toggleMode,
    }),
    [mode, ready, setMode, toggleMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useGastroTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useGastroTheme must be used within GastroThemeProvider');
  return ctx;
}
