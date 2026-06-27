'use client';

import { useMemo } from 'react';

export type OnlineOrderDayHours = {
  closed?: boolean;
  open?: string;
  close?: string;
};

export type OnlineOrderHours = {
  timezone: string;
  weekly: Record<string, OnlineOrderDayHours>;
};

const DAY_ROWS: Array<{ key: string; label: string }> = [
  { key: 'mon', label: 'Pazartesi' },
  { key: 'tue', label: 'Salı' },
  { key: 'wed', label: 'Çarşamba' },
  { key: 'thu', label: 'Perşembe' },
  { key: 'fri', label: 'Cuma' },
  { key: 'sat', label: 'Cumartesi' },
  { key: 'sun', label: 'Pazar' },
];

export function defaultOnlineOrderHours(): OnlineOrderHours {
  return {
    timezone: 'Europe/Istanbul',
    weekly: Object.fromEntries(
      DAY_ROWS.map(({ key }) => [key, { closed: false, open: '11:00', close: '23:00' }]),
    ),
  };
}

type Props = {
  value: OnlineOrderHours | null;
  onChange: (next: OnlineOrderHours) => void;
  required?: boolean;
};

export function OnlineOrderHoursEditor({ value, onChange, required = false }: Props) {
  const hours = useMemo(() => value ?? defaultOnlineOrderHours(), [value]);

  function patchDay(key: string, patch: Partial<OnlineOrderDayHours>) {
    onChange({
      ...hours,
      weekly: {
        ...hours.weekly,
        [key]: { ...hours.weekly[key], ...patch },
      },
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface/60 p-4">
      <p className="text-sm font-semibold text-content">
        Çalışma saatleri {required ? '(zorunlu)' : ''}
      </p>
      <p className="mt-1 text-xs text-content-muted">
        Kapanış saatinde sistem otomatik siparişi kapatır — paneli kapatmayı unutsan bile (ör. 23:00).
      </p>
      <div className="mt-3 space-y-2">
        {DAY_ROWS.map(({ key, label }) => {
          const day = hours.weekly[key] ?? { closed: true };
          const closed = Boolean(day.closed);
          return (
            <div
              key={key}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm">
              <span className="w-24 shrink-0 font-medium text-content">{label}</span>
              <label className="flex items-center gap-1 text-xs text-content-muted">
                <input
                  type="checkbox"
                  checked={closed}
                  onChange={(e) => patchDay(key, { closed: e.target.checked })}
                  className="rounded border-border"
                />
                Kapalı
              </label>
              {!closed ? (
                <>
                  <input
                    type="time"
                    value={day.open ?? '11:00'}
                    onChange={(e) => patchDay(key, { open: e.target.value, closed: false })}
                    className="rounded border border-border bg-surface px-2 py-1 text-xs text-content"
                  />
                  <span className="text-content-muted">–</span>
                  <input
                    type="time"
                    value={day.close ?? '23:00'}
                    onChange={(e) => patchDay(key, { close: e.target.value, closed: false })}
                    className="rounded border border-border bg-surface px-2 py-1 text-xs text-content"
                  />
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
