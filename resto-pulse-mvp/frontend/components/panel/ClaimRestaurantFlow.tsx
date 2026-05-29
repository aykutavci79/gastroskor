'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

import { usePanel } from '@/components/panel/PanelContext';
import {
  addPanelCompetitor,
  getPanelDashboard,
  searchLivePlaces,
  sendRestaurantClaimOtp,
  startRestaurantClaim,
  submitRestaurantTaxDocument,
  verifyRestaurantClaimOtp,
} from '@/lib/api';
import type { LivePlaceSearchItem } from '@/lib/types';

export function ClaimRestaurantFlow() {
  const { userEmail, refresh, access } = usePanel();
  const router = useRouter();
  const [isPanelAdmin, setIsPanelAdmin] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LivePlaceSearchItem[]>([]);
  const [selected, setSelected] = useState<LivePlaceSearchItem | null>(null);
  const [step, setStep] = useState<'search' | 'verify'>('search');
  const [phoneInfo, setPhoneInfo] = useState<{
    is_mobile: boolean;
    requires_tax_document: boolean;
    phone_masked: string | null;
  } | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [taxNote, setTaxNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/panel/admin/status')
      .then((r) => r.json())
      .then((data: { is_panel_admin?: boolean }) => setIsPanelAdmin(Boolean(data.is_panel_admin)))
      .catch(() => setIsPanelAdmin(false));
  }, []);

  async function adminGrantPlace(place: LivePlaceSearchItem) {
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
          admin_note: `Admin bypass: ${place.name}`,
        }),
      });
      const data = (await res.json()) as { detail?: string };
      if (!res.ok) {
        throw new Error(typeof data.detail === 'string' ? data.detail : 'Admin baglama basarisiz');
      }
      setMessage(`${place.name} panele baglandi (eski mekan degistirildi).`);
      await refresh();
      router.push('/panel');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin baglama basarisiz');
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
      const data = await searchLivePlaces({ q: query.trim(), city: 'Bursa', limit: 6 });
      setResults(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Arama basarisiz');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function onSelectPlace(place: LivePlaceSearchItem) {
    if (!userEmail) return;
    if (isPanelAdmin && access?.has_ownership) {
      await adminGrantPlace(place);
      return;
    }
    setSelected(place);
    setLoading(true);
    setError(null);
    try {
      const claim = await startRestaurantClaim({
        user_email: userEmail,
        place_id: place.place_id,
        city: 'Bursa',
      });
      setPhoneInfo(claim.phone_info);
      setStep('verify');
      setMessage(`${claim.restaurant_name} secildi.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Mekan baglanamadi';
      setError(msg);
      if (isPanelAdmin && msg.includes('baska bir mekan')) {
        setError(
          `${msg} Admin olarak /panel/admin sayfasindan "Panele bagla" kullanin veya asagidaki sonuca tekrar tiklayin.`,
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function onSendOtp() {
    if (!userEmail) return;
    setLoading(true);
    setError(null);
    try {
      const result = await sendRestaurantClaimOtp(userEmail);
      setMessage(`SMS gonderildi: ${result.phone_masked}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SMS gonderilemedi');
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyOtp(event: FormEvent) {
    event.preventDefault();
    if (!userEmail) return;
    setLoading(true);
    setError(null);
    try {
      await verifyRestaurantClaimOtp({ user_email: userEmail, code: otpCode.trim() });
      await refresh();
      setMessage('Dogrulama tamam. Panel acildi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kod hatali');
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitTax(event: FormEvent) {
    event.preventDefault();
    if (!userEmail) return;
    setLoading(true);
    setError(null);
    try {
      await submitRestaurantTaxDocument({ user_email: userEmail, note: taxNote.trim() });
      await refresh();
      setMessage('Vergi levhasi kaydi alindi. Kisitli panel acildi; ziyaret sonrasi tam panel.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayit basarisiz');
    } finally {
      setLoading(false);
    }
  }

  if (access?.can_access_panel && access.verification_status !== 'pending_sms' && !isPanelAdmin) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-emerald-100">
        <p className="font-semibold">Mekaniniz bagli.</p>
        <p className="mt-1 text-sm">Dashboard&apos;a gecebilirsiniz.</p>
        <a href="/panel" className="mt-4 inline-block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950">
          Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-6">
        <h2 className="text-xl font-semibold text-white">Mekanini Bagla</h2>
        <p className="mt-1 text-sm text-slate-400">
          Giris tamam. Simdi Google Maps&apos;teki isletme adinizi yazin, listeden secin. Cep telefonu
          varsa SMS, sabit hat ise vergi levhasi notu ile devam edilir.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Ornek arama: <span className="text-slate-300">Urfali Kebap Bursa</span> veya isletme adiniz + sehir
        </p>

        {isPanelAdmin ? (
          <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            <p className="font-medium">Admin modu</p>
            <p className="mt-1 text-amber-50/90">
              Hesapta kayitli mekan: <strong>{access?.restaurant_name ?? '—'}</strong>. Baska mekana gecmek icin
              arama sonucuna tiklayin — SMS/vergi atlanir, eski kayit degistirilir.
            </p>
            <Link href="/panel/admin" className="mt-2 inline-block text-xs text-amber-200 underline">
              veya /panel/admin
            </Link>
          </div>
        ) : null}

        {step === 'search' ? (
          <form onSubmit={onSearch} className="mt-4 flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ornek: Urfali Kebap Bursa"
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950">
              Ara
            </button>
          </form>
        ) : null}

        {step === 'search' && results.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {results.map((place) => (
              <li key={place.place_id}>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white">{place.name}</p>
                    <p className="text-xs text-slate-400">{place.address}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onSelectPlace(place)}
                    disabled={loading}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                      isPanelAdmin
                        ? 'bg-amber-500 text-amber-950 hover:bg-amber-400'
                        : 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400'
                    }`}>
                    {isPanelAdmin ? 'Admin: Panele bagla' : 'Sec'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {step === 'verify' && selected ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-slate-300">Secilen: {selected.name}</p>
            {phoneInfo?.is_mobile ? (
              <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                <p className="text-sm text-slate-300">
                  {phoneInfo.phone_masked} numaraya SMS kodu gonderilecek.
                </p>
                <button
                  type="button"
                  onClick={() => void onSendOtp()}
                  disabled={loading}
                  className="mt-3 rounded-lg border border-sky-400/40 bg-sky-400/10 px-3 py-1.5 text-sm text-sky-100">
                  SMS Kodu Gonder
                </button>
                <form onSubmit={onVerifyOtp} className="mt-3 flex gap-2">
                  <input
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="6 haneli kod"
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950">
                    Onayla
                  </button>
                </form>
              </div>
            ) : (
              <form onSubmit={onSubmitTax} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-sm text-amber-100">
                  Google&apos;da kayitli numara cep telefonu degil. Vergi levhasi bilgisini birakin; kisitli
                  panel acilir, ziyaret sonrasi tam panel acilir.
                </p>
                <textarea
                  value={taxNote}
                  onChange={(e) => setTaxNote(e.target.value)}
                  rows={4}
                  placeholder="Isletme unvani, vergi no, WhatsApp ile belge gonderdim vb."
                  className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-3 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950">
                  Basvuruyu Gonder
                </button>
              </form>
            )}
          </div>
        ) : null}
      </section>

      {message ? (
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-sky-100">{message}</div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div>
      ) : null}
    </div>
  );
}
