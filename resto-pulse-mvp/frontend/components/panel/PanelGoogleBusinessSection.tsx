'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { usePanel } from '@/components/panel/PanelContext';
import {
  analyzeGoogleBusiness,
  disconnectGoogleBusiness,
  getGoogleBusinessConnectUrl,
} from '@/lib/api';
import type { GoogleBusinessStatus } from '@/lib/types';

type Props = {
  status: GoogleBusinessStatus;
  onUpdated: () => void;
};

export function PanelGoogleBusinessSection({ status, onUpdated }: Props) {
  const { userEmail } = usePanel();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState<'connect' | 'analyze' | 'disconnect' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const flag = searchParams.get('google_business');
    if (!flag) return;
    if (flag === 'connected') {
      setMessage('Google Isletme hesabiniz baglandi. Simdi tam analiz yapabilirsiniz.');
      onUpdated();
    } else if (flag === 'denied') {
      setError('Google baglantisi iptal edildi.');
    } else if (flag === 'error') {
      const msg = searchParams.get('msg');
      setError(msg ? decodeURIComponent(msg) : 'Google baglantisi basarisiz.');
    }
  }, [searchParams, onUpdated]);

  async function onConnect() {
    if (!userEmail) return;
    setBusy('connect');
    setError(null);
    try {
      const { auth_url } = await getGoogleBusinessConnectUrl(userEmail);
      window.location.href = auth_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Baglanti baslatilamadi');
      setBusy(null);
    }
  }

  async function onAnalyze() {
    if (!userEmail) return;
    setBusy('analyze');
    setError(null);
    setMessage(null);
    try {
      const report = await analyzeGoogleBusiness(userEmail);
      setMessage(
        `Tam Google analizi tamamlandi (${report.reviews_total ?? '?'} yorum havuzu). Ozet rapor gecmisine eklendi.`,
      );
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analiz basarisiz');
    } finally {
      setBusy(null);
    }
  }

  async function onDisconnect() {
    if (!userEmail) return;
    setBusy('disconnect');
    setError(null);
    try {
      await disconnectGoogleBusiness(userEmail);
      setMessage('Google baglantisi kesildi.');
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Baglanti kesilemedi');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-2xl border border-border/70 bg-surface-input p-5">
      <h2 className="text-lg font-semibold text-content">Google Isletmemi Bagla</h2>
      <p className="mt-2 text-sm text-content-muted">
        Kendi Google Isletme hesabinizi baglayarak tum yorumlarinizdan AI ozet analizi alin. Ham yorum
        metni saklanmaz; yalnizca panel ozet raporu kaydedilir.
      </p>

      {status.connected ? (
        <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-content">
          <p>
            <strong>Bagli:</strong> {status.location_title ?? 'Isletme'}
            {status.google_email ? ` · ${status.google_email}` : ''}
          </p>
          {status.last_review_count != null ? (
            <p className="mt-1 text-xs text-content-muted">
              Son senkron: {status.last_review_count} Google yorumu
              {status.last_sync_at
                ? ` · ${new Date(status.last_sync_at).toLocaleDateString('tr-TR')}`
                : ''}
            </p>
          ) : null}
          {status.last_error ? (
            <p className="mt-2 text-xs text-amber-200">{status.last_error}</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-content-muted">
          Rakip analizinde yalnizca Google&apos;in ornek ~5 yorumu kullanilir. Baglanti ile kendi
          isletmenizin tum yorum havuzu analiz edilir.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {!status.connected ? (
          <button
            type="button"
            onClick={() => void onConnect()}
            disabled={busy !== null}
            className="rounded-lg bg-brand-gold px-4 py-2 text-sm font-semibold text-surface hover:opacity-90 disabled:opacity-50">
            {busy === 'connect' ? 'Yonlendiriliyor...' : 'Google ile baglan'}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void onAnalyze()}
              disabled={busy !== null}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-content hover:bg-violet-500 disabled:opacity-50">
              {busy === 'analyze' ? 'Analiz...' : 'Tam Google analizi (AI)'}
            </button>
            <button
              type="button"
              onClick={() => void onDisconnect()}
              disabled={busy !== null}
              className="rounded-lg border border-border px-4 py-2 text-sm text-content-muted hover:bg-surface-input disabled:opacity-50">
              Baglantiyi kes
            </button>
          </>
        )}
      </div>

      {message ? <p className="mt-3 text-sm text-emerald-200">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}

      <p className="mt-4 text-xs text-content-muted">
        Google Cloud&apos;da OAuth redirect URI: backend callback (
        <code className="text-content">/api/v1/panel/google-business/callback</code>) ve Business
        Profile API erisimi gerekir. Test kullanicisi olarak eklenen hesaplarla deneyebilirsiniz.
      </p>
    </section>
  );
}
