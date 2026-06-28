'use client';

import { useMemo, useState } from 'react';

import { cityDisplayName, normalizeCityInput, SUPPORTED_CITIES } from '@/lib/turkiye-provinces';

type Props = {
  id?: string;
  value: string;
  onChange: (city: string) => void;
  className?: string;
  label?: string;
  hideLabel?: boolean;
};

export function ProvinceSelect({
  id = 'province-select',
  value,
  onChange,
  className = '',
  label = 'İl seçin',
  hideLabel = false,
}: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr');
    if (!q) return [...SUPPORTED_CITIES];
    return SUPPORTED_CITIES.filter((city) => city.toLocaleLowerCase('tr').includes(q));
  }, [query]);

  const displayValue = cityDisplayName(value);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {hideLabel ? null : (
        <label htmlFor={`${id}-search`} className="text-xs font-semibold text-content-muted">
          {label}
        </label>
      )}
      <input
        id={`${id}-search`}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={`${displayValue} — il ara…`}
        className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-content outline-none focus:border-amber-500/60"
        autoComplete="off"
      />
      <select
        id={id}
        value={normalizeCityInput(value)}
        onChange={(event) => {
          onChange(event.target.value);
          setQuery('');
        }}
        className="w-full rounded-lg border border-border bg-surface-input px-2.5 py-2 text-sm text-content outline-none focus:border-brand-gold/50">
        {filtered.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
