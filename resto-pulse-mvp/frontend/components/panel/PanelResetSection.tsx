'use client';

import { useState } from 'react';

import { resetPanelPublicData } from '@/lib/api';

type Props = {
  userEmail: string;
  restaurantName?: string | null;
  onReset?: () => void;
};

export function PanelResetSection({ userEmail, restaurantName, onReset }: Props) {
  const [hideFromPublic, setHideFromPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onResetClick() {
    const label = restaurantName?.trim() || 'bu mekan';
    const ok = window.confirm(
      `${label} icin tum test siparisleri, menu ve promo (fotolar, kurye, online siparis) silinsin mi?` +
        (hideFromPublic ? ' Mekan siteden de gizlenir (deneme kapanir).' : ''),
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await resetPanelPublicData(userEmail, hideFromPublic);
      setMessage(
        `Sifirlandi: ${result.orders_deleted} siparis, ${result.menu_items_deleted} menu ogesi.` +
          (result.hide_from_public ? ' Siteden gizlendi.' : ''),
      );
      onReset?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sifirlama basarisiz');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-rose-500/40 bg-rose-500/5 p-5">
      <h2 className="text-lg font-semibold text-rose-100">Test verilerini temizle</h2>
      <p className="mt-1 text-sm text-content-muted">
        Deneme siparisleri, menu ve vitrin fotolarini kalici siler. Canli sitede gercek isletme gorunmesin diye
        kullanin.
      </p>
      <label className="mt-4 flex items-center gap-2 text-sm text-content">
        <input
          type="checkbox"
          checked={hideFromPublic}
          onChange={(e) => setHideFromPublic(e.target.checked)}
          className="rounded border-border"
        />
        Siteden gizle (deneme / partner rozetini kapat)
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={() => void onResetClick()}
        className="mt-4 rounded-xl border border-rose-500/50 bg-rose-600/20 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-600/30 disabled:opacity-50">
        {busy ? 'Siliniyor...' : 'Kokten sifirla'}
      </button>
      {message ? <p className="mt-3 text-sm text-success">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </section>
  );
}
