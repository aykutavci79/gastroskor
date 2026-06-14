'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import type { CityDetectStatus } from '@/hooks/useDetectedCity';
import { getCityAtmosphere } from '@/lib/city-atmosphere';

type Props = {
  city: string;
  status: CityDetectStatus;
};

export function CityAtmosphereStrip({ city, status }: Props) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const theme = getCityAtmosphere(city);
  const isLight = mounted && resolvedTheme === 'light';

  useEffect(() => setMounted(true), []);

  const statusLine =
    status === 'loading'
      ? 'Konum alınıyor…'
      : status === 'denied'
        ? 'Şehir seçimin geçerli'
        : 'Konumuna göre';

  const textStyle = isLight ? { color: theme.light.text } : undefined;
  const mutedStyle = isLight ? { color: `${theme.light.text}cc` } : undefined;

  return (
    <div
      key={`${theme.cityKey}-${isLight ? 'light' : 'dark'}`}
      className="city-atmosphere-strip relative overflow-hidden rounded-xl border border-border/50 transition-[border-color,background-color] duration-500"
      style={
        isLight
          ? { backgroundColor: theme.light.background, borderColor: `${theme.light.text}22` }
          : { background: theme.gradient }
      }
      aria-label={`${theme.label} atmosfer şeridi`}>
      <div className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 sm:py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{
              backgroundColor: isLight ? theme.light.accent : theme.accent,
              boxShadow: isLight ? 'none' : `0 0 10px ${theme.accent}`,
            }}
            aria-hidden
          />
          <span
            className={`truncate text-sm font-bold tracking-tight ${isLight ? '' : 'text-content'}`}
            style={textStyle}>
            {theme.label}
          </span>
          <span
            className={`hidden text-[11px] font-medium sm:inline ${isLight ? '' : 'text-content-muted/75'}`}
            style={mutedStyle}>
            {statusLine}
          </span>
        </div>
        <p
          className={`min-w-0 truncate text-[11px] font-medium sm:text-xs ${isLight ? '' : 'text-content-muted/85'}`}
          style={mutedStyle}>
          {theme.hint}
        </p>
      </div>
    </div>
  );
}
