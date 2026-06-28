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
  const [adminReviews, setAdminReviews] = useState<
    Array<{
      id: string;
      restaurant_id: string;
      restaurant_name: string | null;
      review_text: string;
      rating: number;
      review_kind?: string;
      publication_status?: string;
      created_at: string | null;
      author_email: string | null;
      author_name?: string | null;
    }>
  >([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewSearch, setReviewSearch] = useState('');
  const [adminStatus, setAdminStatus] = useState<{
    is_panel_admin?: boolean;
    admin_emails_configured?: boolean;
    panel_admin_secret_configured?: boolean;
    railway?: {
      is_panel_admin?: boolean;
      admin_emails_configured?: boolean;
      panel_admin_secret_configured?: boolean;
      hint?: string;
      detail?: string;
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

  async function loadRecentReviews() {
    setReviewsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/panel/admin/reviews/recent?limit=80');
      const data = (await res.json()) as { items?: typeof adminReviews; detail?: string };
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Yorumlar yuklenemedi');
      setAdminReviews(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yorumlar yuklenemedi');
    } finally {
      setReviewsLoading(false);
    }
  }

  async function searchAdminReviews() {
    const q = reviewSearch.trim();
    if (q.length < 2) {
      setError('Arama icin en az 2 karakter yazin.');
      return;
    }
    setReviewsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q, limit: '80' });
      const res = await fetch(`/api/panel/admin/reviews/search?${params}`);
      const data = (await res.json()) as { items?: typeof adminReviews; detail?: string };
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Arama basarisiz');
      setAdminReviews(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Arama basarisiz');
    } finally {
      setReviewsLoading(false);
    }
  }

  async function deleteAdminReview(reviewId: string) {
    if (!window.confirm('Bu yorum kalici olarak silinecek. Emin misiniz?')) return;
    setReviewsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/panel/admin/reviews/${encodeURIComponent(reviewId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = (await res.json()) as { detail?: string };
        throw new Error(typeof data.detail === 'string' ? data.detail : 'Silinemedi');
      }
      setAdminReviews((prev) => prev.filter((row) => row.id !== reviewId));
      setMessage('Yorum silindi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silinemedi');
    } finally {
      setReviewsLoading(false);
    }
  }

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
          force_takeover: true,
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

  async function onUnlinkOwnership() {
    if (!userEmail) return;
    const ok = window.confirm(
      'Hesabinizdaki mekan baglantisi tamamen koparilsin mi? (Kokten sifirla sadece menu/siparis siler; bu islem panel kaydini siler.)',
    );
    if (!ok) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/panel/admin/unlink-ownership', { method: 'POST' });
      const data = (await res.json()) as { detail?: string; removed?: boolean; restaurant_name?: string | null };
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Mekan koparilamadi');
      if (data.removed) {
        setMessage(`${data.restaurant_name ?? 'Mekan'} hesabinizdan koparildi.`);
      } else {
        setMessage('Hesapta bagli mekan yoktu.');
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mekan koparilamadi');
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

  async function verifyDenemeRestaurantsOnline(): Promise<string[] | null> {
    try {
      const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.gastroskor.com.tr').replace(/\/$/, '');
      const res = await fetch(
        `${apiBase}/api/v1/restaurants/online-orders-open?city=Bursa&limit=50&min_rating=3`,
        { cache: 'no-store' },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { items?: Array<{ name?: string }> };
      return (data.items ?? [])
        .map((row) => row.name ?? '')
        .filter((name) => name.includes('Deneme') || name.includes('(test)'));
    } catch {
      return null;
    }
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
        railway_status?: number;
      };
      if (!res.ok) {
        const online = await verifyDenemeRestaurantsOnline();
        const detail =
          typeof data.detail === 'string'
            ? data.detail
            : `Seed basarisiz (HTTP ${data.railway_status ?? res.status})`;
        if (online && online.length >= 5) {
          setMessage(
            `Guncelleme tamamlanamadi: ${detail}. API'de ${online.length} Deneme yayinda ama promo/menu bu tiklamada guncellenmemis olabilir. Panelden cikis yapip Google ile tekrar gir, sonra yeniden dene.`,
          );
          return;
        }
        throw new Error(detail);
      }
      const names = (data.restaurants ?? []).map((row) => row.name).filter(Boolean).join(', ');
      setMessage(`Deneme restoranlari hazir (${data.count ?? 0}): ${names || '—'}`);
    } catch (err) {
      const online = await verifyDenemeRestaurantsOnline();
      const failDetail = err instanceof Error ? err.message : 'Seed basarisiz';
      if (online && online.length >= 5) {
        setMessage(
          `Guncelleme tamamlanamadi: ${failDetail}. API'de ${online.length} Deneme yayinda (${online.join(', ')}). Cikis yapip tekrar gir, sonra seed'e bas.`,
        );
        setError(null);
      } else {
        setError(failDetail);
      }
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
        <p className="mt-2 text-xs text-content-muted">
          &quot;Panele bagla&quot; baska kullanicidaki mekani (Deneme tester vb.) otomatik devralir.
        </p>
        <button
          type="button"
          disabled={loading}
          onClick={() => void onUnlinkOwnership()}
          className="mt-4 rounded-xl border border-rose-500/40 bg-rose-600/15 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-600/25 disabled:opacity-50">
          Hesabimdaki mekani kopar (Ozşark vb.)
        </button>
        <p className="mt-2 text-xs text-content-muted">
          &quot;Kokten sifirla&quot; menu/siparis temizler; panelde isim kalir. Temiz baslangic icin once bunu kullanin.
        </p>
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

      <section className="rounded-2xl border border-border bg-surface/80 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-content">GastroSkor yorumlari</h2>
            <p className="text-sm text-content-muted">
              Tester ve uye yorumlarini toplu goruntule, metin ara veya sil.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={reviewsLoading}
              onClick={() => void loadRecentReviews()}
              className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-ink disabled:opacity-50">
              Son yorumlari yukle
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={reviewSearch}
            onChange={(event) => setReviewSearch(event.target.value)}
            placeholder="Yorum metninde ara…"
            className="flex-1 rounded-xl border border-border bg-surface-input px-3 py-2 text-sm text-content"
          />
          <button
            type="button"
            disabled={reviewsLoading}
            onClick={() => void searchAdminReviews()}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-content hover:bg-surface-input disabled:opacity-50">
            Ara
          </button>
        </div>

        {reviewsLoading ? (
          <p className="mt-4 text-sm text-content-muted">Yukleniyor…</p>
        ) : adminReviews.length === 0 ? (
          <p className="mt-4 text-sm text-content-muted">
            Henuz liste yok. &quot;Son yorumlari yukle&quot; ile baslayin.
          </p>
        ) : (
          <ul className="mt-4 max-h-[32rem] space-y-3 overflow-y-auto">
            {adminReviews.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-border bg-surface-input/60 p-4 text-sm text-content">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {row.restaurant_name ?? 'Restoran'} · ★ {row.rating}
                      {row.review_kind ? ` · ${row.review_kind}` : ''}
                    </p>
                    <p className="text-xs text-content-muted">
                      {row.author_name ?? row.author_email ?? 'Anonim'}
                      {row.created_at
                        ? ` · ${new Date(row.created_at).toLocaleString('tr-TR')}`
                        : ''}
                      {row.publication_status ? ` · ${row.publication_status}` : ''}
                    </p>
                    <p className="whitespace-pre-wrap leading-relaxed">{row.review_text || '(Metin yok)'}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <a
                      href={`/restaurants/${row.restaurant_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/10">
                      Mekani ac
                    </a>
                    <button
                      type="button"
                      disabled={reviewsLoading}
                      onClick={() => void deleteAdminReview(row.id)}
                      className="rounded-lg border border-rose-500/50 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/10 disabled:opacity-50">
                      Sil
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
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
