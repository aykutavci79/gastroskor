'use client';

import { FormEvent, useEffect, useState } from 'react';

import { getPanelPromo, updatePanelPromo } from '@/lib/api';
import type { RestaurantPromoSettings } from '@/lib/types';

type Props = {
  userEmail: string;
  subscriptionActive: boolean;
};

export function RestaurantPromoSettings({ userEmail, subscriptionActive }: Props) {
  const [settings, setSettings] = useState<RestaurantPromoSettings | null>(null);
  const [hasOwnCourier, setHasOwnCourier] = useState(false);
  const [directOrderText, setDirectOrderText] = useState('');
  const [directOrderPhone, setDirectOrderPhone] = useState('');
  const [directOrderWhatsapp, setDirectOrderWhatsapp] = useState('');
  const [directOrderUrl, setDirectOrderUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getPanelPromo(userEmail)
      .then((data) => {
        setSettings(data);
        setHasOwnCourier(data.has_own_courier);
        setDirectOrderText(data.direct_order_text ?? '');
        setDirectOrderPhone(data.direct_order_phone ?? '');
        setDirectOrderWhatsapp(data.direct_order_whatsapp ?? '');
        setDirectOrderUrl(data.direct_order_url ?? '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Ayarlar yuklenemedi'))
      .finally(() => setLoading(false));
  }, [userEmail]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updatePanelPromo({
        user_email: userEmail,
        has_own_courier: hasOwnCourier,
        direct_order_text: directOrderText.trim() || null,
        direct_order_phone: directOrderPhone.trim() || null,
        direct_order_whatsapp: directOrderWhatsapp.trim() || null,
        direct_order_url: directOrderUrl.trim() || null,
      });
      setSettings(updated);
      setMessage('Gorunurluk rozetleri kaydedildi. Abonelik aktifken listede gorunur.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayit basarisiz');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Gorunurluk ayarlari yukleniyor...</p>;
  }

  return (
    <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5">
      <h2 className="text-lg font-semibold text-white">Musteri karti rozetleri</h2>
      <p className="mt-1 text-sm text-slate-400">
        Abonelik / deneme aktifken arama ve trend listesinde kartinizda gorunur. Komisyonsuz kanal:
        musteriyi kendi telefon veya WhatsApp&apos;iniza yonlendirin.
      </p>
      {!subscriptionActive ? (
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          Abonelik veya deneme bitince rozetler otomatik kapanir.
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={hasOwnCourier}
            onChange={(e) => setHasOwnCourier(e.target.checked)}
            className="rounded border-slate-600"
          />
          Kendi kuryem var (kartta rozet)
        </label>

        <div>
          <label className="text-xs text-slate-500">Teklif metni (ornek: Buradan siparis · %10 indirim)</label>
          <input
            value={directOrderText}
            onChange={(e) => setDirectOrderText(e.target.value)}
            maxLength={120}
            placeholder="Buradan siparis · %10 indirim"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-slate-500">Telefon (tiklayinca arama)</label>
            <input
              value={directOrderPhone}
              onChange={(e) => setDirectOrderPhone(e.target.value)}
              placeholder="05xx xxx xx xx"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">WhatsApp (numara, ulke kodu ile)</label>
            <input
              value={directOrderWhatsapp}
              onChange={(e) => setDirectOrderWhatsapp(e.target.value)}
              placeholder="905xxxxxxxxx"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500">Siparis linki (opsiyonel menü URL)</label>
          <input
            value={directOrderUrl}
            onChange={(e) => setDirectOrderUrl(e.target.value)}
            placeholder="https://..."
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>

        {settings?.public_preview ? (
          <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
            <p className="text-xs text-slate-500">Onizleme (musteri gorunumu)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {settings.public_preview.has_own_courier ? (
                <span className="text-xs text-sky-200">🛵 Kendi kurye</span>
              ) : null}
              {settings.public_preview.direct_order_text ? (
                <span className="text-xs text-emerald-200">{settings.public_preview.direct_order_text}</span>
              ) : null}
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={saving || !subscriptionActive}
          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-50">
          {saving ? 'Kaydediliyor...' : 'Rozetleri kaydet'}
        </button>
      </form>

      {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </section>
  );
}
