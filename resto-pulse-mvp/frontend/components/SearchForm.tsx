'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

type Props = {
  initialQ?: string;
  initialCity?: string;
};

const CITIES = ['Bursa', 'Istanbul', 'Ankara', 'Izmir', 'Antalya'];

export function SearchForm({ initialQ = '', initialCity = '' }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [city, setCity] = useState(initialCity);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (city.trim()) params.set('city', city.trim());
    const query = params.toString();
    router.push(query ? `/?${query}` : '/');
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-2xl border border-slate-700/70 bg-panel/70 p-4 sm:grid-cols-[1fr_180px_auto]">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Restoran adi ara..."
        className="rounded-xl border border-slate-600 bg-slate-900/70 px-4 py-2.5 text-slate-100 outline-none focus:ring-2 focus:ring-accent/40"
      />
      <select
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className="rounded-xl border border-slate-600 bg-slate-900/70 px-4 py-2.5 text-slate-100 outline-none focus:ring-2 focus:ring-accent/40">
        <option value="">Tum sehirler</option>
        {CITIES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-xl bg-accent px-5 py-2.5 font-semibold text-ink transition hover:brightness-110">
        Ara
      </button>
    </form>
  );
}
