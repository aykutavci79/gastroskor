'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';

import { CARD_EMOJI_PRESETS } from '@/lib/card-emoji-presets';
import { getPanelPromo, updatePanelPromo, uploadPanelMenuImage } from '@/lib/api';
import type { RestaurantPromoSettings } from '@/lib/types';

type Props = {
  userEmail: string;
  subscriptionActive: boolean;
};

export function RestaurantPromoSettings({ userEmail, subscriptionActive }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<RestaurantPromoSettings | null>(null);
  const [hasOwnCourier, setHasOwnCourier] = useState(false);
  const [directOrderText, setDirectOrderText] = useState('');
  const [directOrderPhone, setDirectOrderPhone] = useState('');
  const [directOrderWhatsapp, setDirectOrderWhatsapp] = useState('');
  const [directOrderUrl, setDirectOrderUrl] = useState('');
  const [instagram, setInstagram] = useState('');
  const [cardEmoji, setCardEmoji] = useState<string | null>(null);
  const [menuImageUrl, setMenuImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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
        setInstagram(data.instagram ?? '');
        setCardEmoji(data.card_emoji);
        setMenuImageUrl(data.menu_image_url);
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
        instagram: instagram.trim() || null,
        card_emoji: cardEmoji,
        menu_image_url: menuImageUrl,
      });
      setSettings(updated);
      setMenuImageUrl(updated.menu_image_url);
      setMessage('Gorunurluk ayarlari kaydedildi. Abonelik aktifken listede gorunur.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayit basarisiz');
    } finally {
      setSaving(false);
    }
  }

  async function onMenuFileSelected(file: File | undefined) {
    if (!file || !subscriptionActive) return;
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await uploadPanelMenuImage(userEmail, file);
      setMenuImageUrl(result.menu_image_url);
      setSettings(result.settings);
      setMessage('Menu fotografi yuklendi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yukleme basarisiz');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function removeMenuImage() {
    setUploading(true);
    setError(null);
    try {
      const updated = await updatePanelPromo({
        user_email: userEmail,
        has_own_courier: hasOwnCourier,
        menu_image_url: null,
        instagram: instagram.trim() || null,
        card_emoji: cardEmoji,
        direct_order_text: directOrderText.trim() || null,
        direct_order_phone: directOrderPhone.trim() || null,
        direct_order_whatsapp: directOrderWhatsapp.trim() || null,
        direct_order_url: directOrderUrl.trim() || null,
      });
      setSettings(updated);
      setMenuImageUrl(null);
      setMessage('Menu fotografi kaldirildi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silinemedi');
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Gorunurluk ayarlari yukleniyor...</p>;
  }

  return (
    <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5">
      <h2 className="text-lg font-semibold text-white">Musteri karti rozetleri</h2>
      <p className="mt-1 text-sm text-slate-400">
        Abonelik / deneme aktifken arama ve trend listesinde kartinizda gorunur. Sag tarafta tam
        yukseklikte urun veya menu fotografi (sola dogru kaybolur); solda isim ve Google / GS puanlari.
        Instagram veya web linki altta kucuk ikon olarak cikar.
      </p>
      {!subscriptionActive ? (
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          Abonelik veya deneme bitince rozetler otomatik kapanir.
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <label className="text-xs text-slate-500">Kart emojisi (fotograf yokken)</label>
          <p className="mt-1 text-xs text-slate-500">
            Menu / urun fotografi yuklemediyseniz sag tarafta bu emoji veya otomatik tahmin gorunur.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCardEmoji(null)}
              className={`rounded-lg border px-3 py-2 text-xs ${
                cardEmoji == null
                  ? 'border-accent bg-accent/20 text-accent'
                  : 'border-slate-600 text-slate-400 hover:border-slate-500'
              }`}>
              Otomatik
            </button>
            {CARD_EMOJI_PRESETS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setCardEmoji(emoji)}
                className={`rounded-lg border px-3 py-2 text-xl ${
                  cardEmoji === emoji
                    ? 'border-accent bg-accent/20 ring-1 ring-accent/50'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
                title="Bu emojiyi kullan">
                {emoji}
              </button>
            ))}
          </div>
          {cardEmoji ? (
            <p className="mt-2 text-sm text-emerald-300">Secili: {cardEmoji}</p>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Otomatik tahmin acik</p>
          )}
        </div>

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
          <label className="text-xs text-slate-500">Web sitesi (online siparis veya tanitim)</label>
          <input
            value={directOrderUrl}
            onChange={(e) => setDirectOrderUrl(e.target.value)}
            placeholder="https://..."
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>

        <div>
          <label className="text-xs text-slate-500">Instagram (@kullanici veya tam link)</label>
          <input
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="@mekanadi"
            maxLength={120}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>

        <div>
          <label className="text-xs text-slate-500">Menu fotografi (JPG / PNG / WEBP, max 5 MB)</label>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={!subscriptionActive || uploading}
              onChange={(e) => void onMenuFileSelected(e.target.files?.[0])}
              className="text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-sm file:text-white"
            />
            {menuImageUrl ? (
              <button
                type="button"
                disabled={uploading}
                onClick={() => void removeMenuImage()}
                className="text-xs text-rose-300 hover:underline disabled:opacity-50">
                Fotografi kaldir
              </button>
            ) : null}
          </div>
          {menuImageUrl ? (
            <a
              href={menuImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block overflow-hidden rounded-lg border border-slate-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={menuImageUrl} alt="Menu onizleme" className="max-h-40 w-auto object-contain" />
            </a>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              Pizza, kofte vb. urun fotografi veya menu — kartin saginda tam yukseklikte gorunur.
            </p>
          )}
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
              {settings.public_preview.instagram_url ? (
                <span className="text-xs text-pink-200">📷 Instagram</span>
              ) : null}
              {settings.public_preview.menu_image_url ? (
                <span className="text-xs text-amber-200">📋 Menu fotosu</span>
              ) : null}
              {settings.public_preview.direct_order_url ? (
                <span className="text-xs text-slate-300">🌐 Web</span>
              ) : null}
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-50">
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
        {uploading ? <p className="text-xs text-slate-400">Menu fotografi isleniyor...</p> : null}
      </form>

      {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </section>
  );
}
