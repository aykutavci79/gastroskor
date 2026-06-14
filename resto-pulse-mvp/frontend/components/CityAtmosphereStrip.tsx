'use client';

import type { CityDetectStatus } from '@/hooks/useDetectedCity';
import { getCityAtmosphere } from '@/lib/city-atmosphere';

type Props = {
  city: string;
  status: CityDetectStatus;
};

export function CityAtmosphereStrip({ city, status }: Props) {
  const theme = getCityAtmosphere(city);
  const statusLine =
    status === 'loading'
      ? 'Konum alınıyor…'
      : status === 'denied'
        ? 'Şehir seçimin geçerli'
        : 'Konumuna göre';

  return (
    <div
      key={theme.cityKey}
      className="city-atmosphere-strip relative overflow-hidden rounded-xl border border-border/50 transition-[border-color] duration-500"
      style={{ background: theme.gradient }}
      aria-label={`${theme.label} atmosfer şeridi`}>
      <div className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 sm:py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="h-2 w-2 shrink-0 rounded-full shadow-[0_0_10px_currentColor]"
            style={{ backgroundColor: theme.accent, color: theme.accent }}
            aria-hidden
          />
          <span className="truncate text-sm font-bold tracking-tight text-content">{theme.label}</span>
          <span className="hidden text-[11px] font-medium text-content-muted/75 sm:inline">{statusLine}</span>
        </div>
        <p className="min-w-0 truncate text-[11px] font-medium text-content-muted/85 sm:text-xs">{theme.hint}</p>
      </div>
    </div>
  );
}
