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
      className="card grid gap-3 p-4 sm:grid-cols-[1fr_180px_auto]">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Restoran adi ara (en az 2 harf → Google)..."
        className="input-field"
      />
      <label htmlFor="search-form-city" className="sr-only">
        Şehir
      </label>
      <select
        id="search-form-city"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className="input-field"
        aria-label="Şehir">
        <option value="">Tum sehirler</option>
        {CITIES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <button type="submit" className="btn-primary">
        Ara
      </button>
    </form>
  );
}
