import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo } from 'react';

import {
  GastroColorsDark,
  GastroShadowDark,
  type GastroColorScheme,
  type GastroShadowScheme,
} from '@/constants/theme';

const STORAGE_KEY = 'gastroskor-theme';

type ThemeContextValue = {
  /** Mobil: yalnizca koyu mod (gunduz modu web'de). */
  mode: 'dark';
  colors: GastroColorScheme;
  shadow: GastroShadowScheme;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function GastroThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode: 'dark',
      colors: GastroColorsDark,
      shadow: GastroShadowDark,
      ready: true,
    }),
    [],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useGastroTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useGastroTheme must be used within GastroThemeProvider');
  return ctx;
}
