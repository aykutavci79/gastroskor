'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { usePanel } from '@/components/panel/PanelContext';
import { searchLivePlaces } from '@/lib/api';
import type { LivePlaceSearchItem, PanelApplication } from '@/lib/types';

export function PanelAdminTools() {
  const { userEmail, refresh } = usePanel();
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LivePlaceSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [forceTakeover, setForceTakeover] = useState(true);
  const [hideFromPublicOnReset, setHideFromPublicOnReset] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState<PanelApplication[]>([]);
  const [claimRequests, setClaimRequests] = useState<
    Array<{
      ownership_id: string;
      user_email: string | null;
      user_name: string | null;
      restaurant_name: string | null;
      google_place_id: string | null;
      created_at: string | null;
    }>
  >([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appFilter, setAppFilter] = useState<'pending' | 'approved' | 'rejected' | ''>('pending');
  const [forceTakeoverApps, setForceTakeoverApps] = useState(true);
  const [adminStatus, setAdminStatus] = useState<{
    is_panel_admin?: boolean;
    admin_emails_configured?: boolean;
    panel_admin_secret_configured?: boolean;
    railway?: {
      is_panel_admin?: boolean;
      admin_emails_configured?: boolean;
      panel_admin_secret_configured?: boolean;
      hint?: string;
      http_status?: number;
      error?: string;
    } | null;
  } | null>(null);

  useEffect(() => {
    fetch('/api/panel/admin/status')
      .then((r) => r.json())
      .then((data) => {
        setAdminStatus(data);
        setAllowed(Boolean(data.is_panel_admin));
      })
      .catch(() => setAllowed(false));
  }, []);

  async function loadClaimRequests() {
    setClaimsLoading(true);
    try {
      const res = await fetch('/api/panel/admin/claim-requests');
      const data = (await res.json()) as {
        items?: typeof claimRequests;
        detail?: string;
      };
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Claim talepleri yuklenemedi');
      setClaimRequests(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Claim talepleri yuklenemedi');
    } finally {
      setClaimsLoading(false);
    }
  }

  async function onClaimAction(ownershipId: string, action: 'approve' | 'reject') {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/panel/admin/claim-requests/${ownershipId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { detail?: string };
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Islem basarisiz');
      setMessage(action === 'approve' ? 'Mekan onaylandi, panel acildi.' : 'Talep reddedildi.');
      await loadClaimRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Islem basarisiz');
    } finally {
      setLoading(false);
    }
  }

  async function loadApplications(filter = appFilter) {
    setAppsLoading(true);
    try {
      const query = filter ? `?status=${filter}` : '';
      const res = await fetch(`/api/panel/admin/applications${query}`);
      const data = (await res.json()) as { items?: PanelApplication[]; detail?: string };
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Basvurular yuklenemedi');
      setApplications(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Basvurular yuklenemedi');
    } finally {
      setAppsLoading(false);
    }
  }

  useEffect(() => {
    if (allowed) {
      void loadClaimRequests();
      void loadApplications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, appFilter]);

  async function onAppAction(appId: string, action: 'approve' | 'reject' | 'mark-contract-received') {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/panel/admin/applications/${appId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_takeover: forceTakeoverApps }),
      });
      const data = (await res.json()) as { detail?: string };
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Islem basarisiz');
      setMessage(`Basvuru ${action} tamamlandi.`);
      await loadApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Islem basarisiz');
    } finally {
      setLoading(false);
    }
  }

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

  async function onResetPlace(place: LivePlaceSearchItem) {
    const ok = window.confirm(
      `${place.name} test siparisleri, menu ve promo silinsin mi?` +
        (hideFromPublicOnReset ? ' Siteden de gizlenir (deneme kapanir).' : ''),
    );
    if (!ok) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/panel/admin/reset-public-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          place_id: place.place_id,
          hide_from_public: hideFromPublicOnReset,
        }),
      });
      const data = (await res.json()) as {
        detail?: string;
        orders_deleted?: number;
        menu_items_deleted?: number;
      };
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Sifirlama basarisiz');
      setMessage(
        `${place.name}: ${data.orders_deleted ?? 0} siparis, ${data.menu_items_deleted ?? 0} menu silindi.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sifirlama basarisiz');
    } finally {
      setLoading(false);
    }
  }

  if (allowed === null) {
    return <p className="text-sm text-content-muted">Admin yetkisi kontrol ediliyor...</p>;
  }

  if (!allowed) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-100">
        Bu sayfa sadece <strong>PANEL_ADMIN_EMAILS</strong> listesindeki Google hesaplari icindir.
        Vercel ve Railway&apos;de kendi e-postani ekle, redeploy et.
      </div>
    );
  }

  async function onSeedTesterRestaurants() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/panel/admin/seed-tester-restaurants', { method: 'POST' });
      const data = (await res.json()) as {
        detail?: string;
        count?: number;
        restaurants?: Array<{ name?: string }>;
      };
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Seed basarisiz');
      const names = (data.restaurants ?? []).map((row) => row.name).filter(Boolean).join(', ');
      setMessage(`Deneme restoranlari hazir (${data.count ?? 0}): ${names || '—'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Seed basarisiz');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-content-muted">
        Pazarlama metrikleri:{' '}
        <a href="/panel/admin/kpi" className="text-brand-gold underline">
          /panel/admin/kpi
        </a>
      </p>
      <section className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-6">
        <h2 className="text-xl font-semibold text-amber-100">Tester — Deneme restoranlari</h2>
        <p className="mt-1 text-sm text-content-muted">
          Expo testleri icin Bursa&apos;da 5 online siparis restorani olusturur veya gunceller (Deneme 1–5).
        </p>
        {adminStatus ? (
          <ul className="mt-3 space-y-1 text-xs text-content-muted">
            <li>
              Vercel admin: {adminStatus.is_panel_admin ? 'evet' : 'hayir'} · e-posta listesi:{' '}
              {adminStatus.admin_emails_configured ? 'tanimli' : 'eksik'}
            </li>
            <li>
              Railway admin:{' '}
              {adminStatus.railway?.is_panel_admin ? 'evet' : 'hayir'} · e-posta listesi:{' '}
              {adminStatus.railway?.admin_emails_configured ? 'tanimli' : 'eksik'}
              {adminStatus.railway?.http_status ? ` · HTTP ${adminStatus.railway.http_status}` : ''}
              {adminStatus.railway?.error ? ` · ${adminStatus.railway.error}` : ''}
            </li>
          </ul>
        ) : null}
        <button
          type="button"
          disabled={loading}
          onClick={() => void onSeedTesterRestaurants()}
          className="mt-4 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          Deneme restoranlarini olustur / guncelle
        </button>
      </section>
      <section className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-6">
        <h2 className="text-xl font-semibold text-emerald-100">Mekan claim talepleri</h2>
        <p className="mt-1 text-sm text-content-muted">
          Panelde &quot;Mekanini bagla&quot; ile gelen talepler. Onaylayinca mekan kullaniciya gecer, deneme baslar.
        </p>
        {claimsLoading ? <p className="mt-3 text-sm text-content-muted">Yukleniyor...</p> : null}
        <ul className="mt-4 space-y-3">
          {claimRequests.map((item) => (
            <li key={item.ownership_id} className="rounded-xl border border-border bg-surface/80 p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-content">{item.restaurant_name ?? 'Mekan'}</p>
                  <p className="text-xs text-content-muted">
                    {item.user_name ?? '—'} · {item.user_email ?? '—'}
                  </p>
                  <p className="text-xs text-content-muted">Place: {item.google_place_id ?? '—'}</p>
                  <p className="mt-1 text-xs text-content-muted">
                    {item.created_at ? new Date(item.created_at).toLocaleString('tr-TR') : '—'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void onClaimAction(item.ownership_id, 'approve')}
                    className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">
                    Onayla
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void onClaimAction(item.ownership_id, 'reject')}
                    className="rounded-lg bg-rose-600/80 px-2 py-1 text-xs text-white">
                    Reddet
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {!claimsLoading && claimRequests.length === 0 ? (
          <p className="mt-3 text-sm text-content-muted">Bekleyen claim yok.</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-6">
        <h2 className="text-xl font-semibold text-sky-100">Isletme basvurulari</h2>
        <p className="mt-1 text-sm text-content-muted">
          <a href="/isletme-basvuru" className="text-accent underline" target="_blank" rel="noreferrer">
            /isletme-basvuru
          </a>{' '}
          formundan gelen kayitlar. Onay icin basvuru sahibi ayni e-posta ile once Google girisi yapmis olmali.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(['pending', 'approved', 'rejected', ''] as const).map((value) => (
            <button
              key={value || 'all'}
              type="button"
              onClick={() => setAppFilter(value)}
              className={`rounded-lg px-3 py-1 text-xs ${
                appFilter === value ? 'bg-sky-500/30 text-sky-50' : 'border border-border text-content-muted'
              }`}>
              {value === 'pending' ? 'Bekleyen' : value === 'approved' ? 'Onayli' : value === 'rejected' ? 'Red' : 'Tumu'}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-xs text-content-muted">
            <input
              type="checkbox"
              checked={forceTakeoverApps}
              onChange={(e) => setForceTakeoverApps(e.target.checked)}
            />
            Onayda mekani devral
          </label>
        </div>
        {appsLoading ? <p className="mt-3 text-sm text-content-muted">Yukleniyor...</p> : null}
        <ul className="mt-4 space-y-3">
          {applications.map((app) => (
            <li key={app.id} className="rounded-xl border border-border bg-surface/80 p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-content">
                    {app.business_name}{' '}
                    <span className="text-xs font-normal text-content-muted">({app.status})</span>
                  </p>
                  <p className="text-xs text-content-muted">
                    {app.contact_name} · {app.panel_email} · {app.phone}
                  </p>
                  <p className="text-xs text-content-muted">
                    {app.google_place_name ?? 'Mekan secilmemis'} · {app.city}
                  </p>
                  <p className="mt-1 text-xs text-content-muted">{new Date(app.created_at ?? '').toLocaleString('tr-TR')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/api/panel/admin/applications/${app.id}/tax-document`}
                    className="rounded-lg border border-border px-2 py-1 text-xs text-content-muted hover:bg-surface-input">
                    Vergi levhasi
                  </a>
                  {app.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => void onAppAction(app.id, 'approve')}
                        className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">
                        Onayla
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => void onAppAction(app.id, 'reject')}
                        className="rounded-lg bg-rose-600/80 px-2 py-1 text-xs text-white">
                        Reddet
                      </button>
                    </>
                  ) : null}
                  {app.status === 'approved' ? (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void onAppAction(app.id, 'mark-contract-received')}
                      className="rounded-lg bg-amber-500 px-2 py-1 text-xs font-semibold text-amber-950">
                      Sozlesme geldi
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
        {!appsLoading && applications.length === 0 ? (
          <p className="mt-3 text-sm text-content-muted">Kayit yok.</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6">
        <h2 className="text-xl font-semibold text-brand-gold">Admin: Mekan bagla (bypass)</h2>
        <p className="mt-2 text-sm text-amber-50/90">
          SMS, vergi levhasi ve ziyaret adimlari atlanir. Tam panel + deneme acilir. Hesap: {userEmail}
        </p>
        <label className="mt-4 flex items-center gap-2 text-sm text-content">
          <input
            type="checkbox"
            checked={forceTakeover}
            onChange={(e) => setForceTakeover(e.target.checked)}
            className="rounded border-border"
          />
          Baska kullanicida olsa mekani devral (force)
        </label>
      </section>

      <section className="rounded-2xl border border-border/70 bg-surface-input p-6">
        <h3 className="text-sm font-semibold text-content">Mekan ara / sifirla</h3>
        <label className="mt-3 flex items-center gap-2 text-xs text-content-muted">
          <input
            type="checkbox"
            checked={hideFromPublicOnReset}
            onChange={(e) => setHideFromPublicOnReset(e.target.checked)}
            className="rounded border-border"
          />
          Sifirlamada siteden gizle (deneme kapat)
        </label>
        <form onSubmit={onSearch} className="mt-3 flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Restoran ara..."
            className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-content"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-primary btn-sm">
            Ara
          </button>
        </form>
        <ul className="mt-4 space-y-2">
          {results.map((place) => (
            <li
              key={place.place_id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface/80 p-3">
              <div>
                <p className="font-medium text-content">{place.name}</p>
                <p className="text-xs text-content-muted">{place.address}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void onGrant(place)}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-400 disabled:opacity-50">
                  Panele bagla
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void onResetPlace(place)}
                  className="rounded-lg border border-rose-500/50 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/10 disabled:opacity-50">
                  Test verilerini sil
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {message ? (
        <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">{message}</div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          <p className="font-medium">{error}</p>
          {adminStatus ? (
            <p className="mt-2 text-xs text-rose-200/80">
              Vercel secret: {adminStatus.panel_admin_secret_configured ? 'tanimli' : 'eksik'} · Railway admin:{' '}
              {adminStatus.railway?.is_panel_admin ? 'evet' : 'hayir'}
              {adminStatus.railway?.panel_admin_secret_configured === false ? ' · Railway secret eksik' : ''}
              {typeof adminStatus.railway?.detail === 'string' ? ` · ${adminStatus.railway.detail}` : ''}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
