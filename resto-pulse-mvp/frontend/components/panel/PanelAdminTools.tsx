'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { usePanel } from '@/components/panel/PanelContext';
import { searchLivePlaces } from '@/lib/api';
import type { LivePlaceSearchItem } from '@/lib/types';

export function PanelAdminTools() {
  const { userEmail, refresh } = usePanel();
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LivePlaceSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [forceTakeover, setForceTakeover] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/panel/admin/status')
      .then((r) => r.json())
      .then((data: { is_panel_admin?: boolean }) => setAllowed(Boolean(data.is_panel_admin)))
      .catch(() => setAllowed(false));
  }, []);

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await searchLivePlaces({ q: query.trim(), city: 'Bursa', limit: 8 });
      setResults(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Arama basarisiz');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function onGrant(place: LivePlaceSearchItem) {
    if (!userEmail) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/panel/admin/grant-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          place_id: place.place_id,
          city: 'Bursa',
          force_takeover: forceTakeover,
          admin_note: `Admin UI: ${place.name}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data.detail === 'string' ? data.detail : 'Baglama basarisiz');
      }
      setMessage(`${place.name} panele baglandi. Dashboard aciliyor...`);
      await refresh();
      router.push('/panel');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Baglama basarisiz');
    } finally {
      setLoading(false);
    }
  }

  if (allowed === null) {
    return <p className="text-sm text-slate-400">Admin yetkisi kontrol ediliyor...</p>;
  }

  if (!allowed) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-100">
        Bu sayfa sadece <strong>PANEL_ADMIN_EMAILS</strong> listesindeki Google hesaplari icindir.
        Vercel ve Railway&apos;de kendi e-postani ekle, redeploy et.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6">
        <h2 className="text-xl font-semibold text-amber-100">Admin: Mekan bagla (bypass)</h2>
        <p className="mt-2 text-sm text-amber-50/90">
          SMS, vergi levhasi ve ziyaret adimlari atlanir. Tam panel + deneme acilir. Hesap: {userEmail}
        </p>
        <label className="mt-4 flex items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={forceTakeover}
            onChange={(e) => setForceTakeover(e.target.checked)}
            className="rounded border-slate-600"
          />
          Baska kullanicida olsa mekani devral (force)
        </label>
      </section>

      <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-6">
        <form onSubmit={onSearch} className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Restoran ara..."
            className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950">
            Ara
          </button>
        </form>
        <ul className="mt-4 space-y-2">
          {results.map((place) => (
            <li
              key={place.place_id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-950/70 p-3">
              <div>
                <p className="font-medium text-white">{place.name}</p>
                <p className="text-xs text-slate-400">{place.address}</p>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => void onGrant(place)}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-400 disabled:opacity-50">
                Panele bagla
              </button>
            </li>
          ))}
        </ul>
      </section>

      {message ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{message}</div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div>
      ) : null}
    </div>
  );
}
