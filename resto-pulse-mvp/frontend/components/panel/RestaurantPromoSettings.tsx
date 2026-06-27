'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';

import { OnlineOrderHoursEditor, defaultOnlineOrderHours, type OnlineOrderHours } from '@/components/panel/OnlineOrderHoursEditor';
import { InstagramIcon } from '@/components/icons/InstagramIcon';
import { CARD_EMOJI_PRESETS } from '@/lib/card-emoji-presets';
import { ONLINE_ORDER_CATEGORIES } from '@/lib/online-order-categories';
import { getPanelPromo, updatePanelPromo, uploadPanelCardCoverImage, uploadPanelMenuImage } from '@/lib/api';
import type { RestaurantPromoSettings } from '@/lib/types';

type Props = {
  userEmail: string;
  subscriptionActive: boolean;
};

export function RestaurantPromoSettings({ userEmail, subscriptionActive }: Props) {
  const menuFileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<RestaurantPromoSettings | null>(null);
  const [hasOwnCourier, setHasOwnCourier] = useState(false);
  const [onlineOrdersEnabled, setOnlineOrdersEnabled] = useState(false);
  const [onlineOrderHours, setOnlineOrderHours] = useState<OnlineOrderHours | null>(null);
  const [orderCategoryTags, setOrderCategoryTags] = useState<string[]>([]);
  const [directOrderText, setDirectOrderText] = useState('');
  const [directOrderPhone, setDirectOrderPhone] = useState('');
  const [directOrderWhatsapp, setDirectOrderWhatsapp] = useState('');
  const [directOrderUrl, setDirectOrderUrl] = useState('');
  const [instagram, setInstagram] = useState('');
  const [cardEmoji, setCardEmoji] = useState<string | null>(null);
  const [menuImageUrl, setMenuImageUrl] = useState<string | null>(null);
  const [cardCoverImageUrl, setCardCoverImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingMenu, setUploadingMenu] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getPanelPromo(userEmail)
      .then((data) => {
        setSettings(data);
        setHasOwnCourier(data.has_own_courier);
        setOnlineOrdersEnabled(data.online_orders_enabled);
        setOnlineOrderHours(data.online_order_hours ?? defaultOnlineOrderHours());
        setOrderCategoryTags(data.online_order_category_tags ?? []);
        setDirectOrderText(data.direct_order_text ?? '');
        setDirectOrderPhone(data.direct_order_phone ?? '');
        setDirectOrderWhatsapp(data.direct_order_whatsapp ?? '');
        setDirectOrderUrl(data.direct_order_url ?? '');
        setInstagram(data.instagram ?? '');
        setCardEmoji(data.card_emoji);
        setMenuImageUrl(data.menu_image_url);
        setCardCoverImageUrl(data.card_cover_image_url);
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
        online_orders_enabled: hasOwnCourier ? onlineOrdersEnabled : false,
        online_order_hours: hasOwnCourier ? onlineOrderHours : null,
        online_order_category_tags: hasOwnCourier ? orderCategoryTags : [],
        direct_order_text: directOrderText.trim() || null,
        direct_order_phone: directOrderPhone.trim() || null,
        direct_order_whatsapp: directOrderWhatsapp.trim() || null,
        direct_order_url: directOrderUrl.trim() || null,
        instagram: instagram.trim() || null,
        card_emoji: cardEmoji,
        menu_image_url: menuImageUrl,
        card_cover_image_url: cardCoverImageUrl,
      });
      setSettings(updated);
      setMenuImageUrl(updated.menu_image_url);
      setCardCoverImageUrl(updated.card_cover_image_url);
      setMessage('Gorunurluk ayarlari kaydedildi. Abonelik aktifken listede gorunur.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayit basarisiz');
    } finally {
      setSaving(false);
    }
  }

  async function onMenuFileSelected(file: File | undefined) {
    if (!file || !subscriptionActive) return;
    setUploadingMenu(true);
    setError(null);
    setMessage(null);
    try {
      const result = await uploadPanelMenuImage(userEmail, file);
      setMenuImageUrl(result.menu_image_url);
      setSettings(result.settings);
      setMessage('Menu fotografi yuklendi. Musteri detay sayfasinda Menü bolumunde acilir.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yukleme basarisiz');
    } finally {
      setUploadingMenu(false);
      if (menuFileInputRef.current) menuFileInputRef.current.value = '';
    }
  }

  async function onCoverFileSelected(file: File | undefined) {
    if (!file || !subscriptionActive) return;
    setUploadingCover(true);
    setError(null);
    setMessage(null);
    try {
      const result = await uploadPanelCardCoverImage(userEmail, file);
      setCardCoverImageUrl(result.card_cover_image_url);
      setSettings(result.settings);
      setMessage('Kart kapak fotografi yuklendi. Liste ve trend kartinin saginda gorunur.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yukleme basarisiz');
    } finally {
      setUploadingCover(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    }
  }

  async function removeMenuImage() {
    setUploadingMenu(true);
    setError(null);
    try {
      const updated = await updatePanelPromo({
        user_email: userEmail,
        has_own_courier: hasOwnCourier,
        menu_image_url: null,
        card_cover_image_url: cardCoverImageUrl,
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
      setUploadingMenu(false);
    }
  }

  async function removeCoverImage() {
    setUploadingCover(true);
    setError(null);
    try {
      const updated = await updatePanelPromo({
        user_email: userEmail,
        has_own_courier: hasOwnCourier,
        card_cover_image_url: null,
        menu_image_url: menuImageUrl,
        instagram: instagram.trim() || null,
        card_emoji: cardEmoji,
        direct_order_text: directOrderText.trim() || null,
        direct_order_phone: directOrderPhone.trim() || null,
        direct_order_whatsapp: directOrderWhatsapp.trim() || null,
        direct_order_url: directOrderUrl.trim() || null,
      });
      setSettings(updated);
      setCardCoverImageUrl(null);
      setMessage('Kart kapak fotografi kaldirildi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silinemedi');
    } finally {
      setUploadingCover(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-content-muted">Gorunurluk ayarlari yukleniyor...</p>;
  }

  return (
    <section className="rounded-2xl border border-border/70 bg-surface-input p-5">
      <h2 className="text-lg font-semibold text-content">Musteri karti rozetleri</h2>
      <p className="mt-1 text-sm text-content-muted">
        Abonelik / deneme aktifken arama ve trend listesinde ayni kart gorunur.{' '}
        <strong className="text-content-muted">Kart kapak</strong> (urun fotografi) liste saginda;{' '}
        <strong className="text-content-muted">menu fotografi</strong> musteri isletme sayfasinda Menü
        bolumunde acilir.
      </p>
      {!subscriptionActive ? (
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-brand-gold">
          Abonelik veya deneme bitince rozetler otomatik kapanir.
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <label className="text-xs text-content-muted">Kart emojisi (fotograf yokken)</label>
          <p className="mt-1 text-xs text-content-muted">
            Menu / urun fotografi yuklemediyseniz sag tarafta bu emoji veya otomatik tahmin gorunur.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCardEmoji(null)}
              className={`rounded-lg border px-3 py-2 text-xs ${
                cardEmoji == null
                  ? 'border-accent bg-accent/20 text-accent'
                  : 'border-border text-content-muted hover:border-brand/50'
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
                    : 'border-border hover:border-brand/50'
                }`}
                title="Bu emojiyi kullan">
                {emoji}
              </button>
            ))}
          </div>
          {cardEmoji ? (
            <p className="mt-2 text-sm text-success">Secili: {cardEmoji}</p>
          ) : (
            <p className="mt-2 text-sm text-content-muted">Otomatik tahmin acik</p>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-content">
          <input
            type="checkbox"
            checked={hasOwnCourier}
            onChange={(e) => {
              const checked = e.target.checked;
              setHasOwnCourier(checked);
              if (!checked) setOnlineOrdersEnabled(false);
            }}
            className="rounded border-border"
          />
          Kendi kuryem var (kartta rozet)
        </label>

        {hasOwnCourier ? (
          <>
            <label className="flex items-center gap-2 text-sm text-content">
              <input
                type="checkbox"
                checked={onlineOrdersEnabled}
                onChange={(e) => setOnlineOrdersEnabled(e.target.checked)}
                className="rounded border-border"
              />
              Online siparis al (uygulamada menu tablosu, telefon ile)
            </label>
            {onlineOrdersEnabled ? (
              <div className="space-y-4">
                <OnlineOrderHoursEditor
                  value={onlineOrderHours}
                  onChange={setOnlineOrderHours}
                  required
                />
                <div>
                <p className="text-xs text-content-muted">
                  Musteri listesinde filtre icin en az bir mutfak secin (zorunlu).
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ONLINE_ORDER_CATEGORIES.map((cat) => {
                    const on = orderCategoryTags.includes(cat.slug);
                    return (
                      <button
                        key={cat.slug}
                        type="button"
                        title={cat.hint}
                        onClick={() =>
                          setOrderCategoryTags((prev) =>
                            on ? prev.filter((slug) => slug !== cat.slug) : [...prev, cat.slug],
                          )
                        }
                        className={`rounded-lg border px-3 py-2 text-left text-xs ${
                          on
                            ? 'border-accent bg-accent/20 text-accent'
                            : 'border-border text-content-muted hover:border-brand/50'
                        }`}>
                        <span className="block font-semibold">{cat.label}</span>
                        {cat.hint ? (
                          <span className="mt-0.5 block text-[10px] opacity-80">{cat.hint}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <VoiceProductCatalogPicker
                  userEmail={userEmail}
                  subscriptionActive={subscriptionActive}
                  onlineOrdersEnabled={onlineOrdersEnabled}
                />
              </div>
            ) : null}
          </>
        ) : null}

        <div>
          <label className="text-xs text-content-muted">Teklif metni (ornek: Buradan siparis · %10 indirim)</label>
          <input
            value={directOrderText}
            onChange={(e) => setDirectOrderText(e.target.value)}
            maxLength={120}
            placeholder="Buradan siparis · %10 indirim"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-content"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-content-muted">Telefon (tiklayinca arama)</label>
            <input
              value={directOrderPhone}
              onChange={(e) => setDirectOrderPhone(e.target.value)}
              placeholder="05xx xxx xx xx"
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-content"
            />
          </div>
          <div>
            <label className="text-xs text-content-muted">WhatsApp (numara, ulke kodu ile)</label>
            <input
              value={directOrderWhatsapp}
              onChange={(e) => setDirectOrderWhatsapp(e.target.value)}
              placeholder="905xxxxxxxxx"
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-content"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-content-muted">Web sitesi (online siparis veya tanitim)</label>
          <input
            value={directOrderUrl}
            onChange={(e) => setDirectOrderUrl(e.target.value)}
            placeholder="https://..."
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-content"
          />
        </div>

        <div>
          <label className="text-xs text-content-muted">Instagram (@kullanici veya tam link)</label>
          <input
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="@mekanadi"
            maxLength={120}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-content"
          />
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <label className="text-sm font-medium text-brand-gold">Kart kapak fotografi</label>
          <p className="mt-1 text-xs text-content-muted">
            Kebap, pizza vb. urun gorseli — ana sayfa ve trend listesinde kartin saginda tam yukseklikte
            gorunur.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input
              ref={coverFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={!subscriptionActive || uploadingCover}
              onChange={(e) => void onCoverFileSelected(e.target.files?.[0])}
              className="text-xs text-content-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-input file:px-3 file:py-1.5 file:text-sm file:text-content"
            />
            {cardCoverImageUrl ? (
              <button
                type="button"
                disabled={uploadingCover}
                onClick={() => void removeCoverImage()}
                className="text-xs text-rose-300 hover:underline disabled:opacity-50">
                Kapak fotografini kaldir
              </button>
            ) : null}
          </div>
          {cardCoverImageUrl ? (
            <a
              href={cardCoverImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cardCoverImageUrl} alt="Kart kapak onizleme" className="max-h-40 w-auto object-cover" />
            </a>
          ) : null}
          {uploadingCover ? <p className="mt-2 text-xs text-content-muted">Kapak fotografi yukleniyor...</p> : null}
        </div>

        <div className="rounded-xl border border-border bg-surface/40 p-4">
          <label className="text-sm font-medium text-content">Menu fotografi</label>
          <p className="mt-1 text-xs text-content-muted">
            Fiyat listesi veya menu sayfasi — musteri isletmeye tiklayinca &quot;Menuyu goruntule&quot; ile
            acilir. Kart kapaginda kullanilmaz.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input
              ref={menuFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={!subscriptionActive || uploadingMenu}
              onChange={(e) => void onMenuFileSelected(e.target.files?.[0])}
              className="text-xs text-content-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-input file:px-3 file:py-1.5 file:text-sm file:text-content"
            />
            {menuImageUrl ? (
              <button
                type="button"
                disabled={uploadingMenu}
                onClick={() => void removeMenuImage()}
                className="text-xs text-rose-300 hover:underline disabled:opacity-50">
                Menu fotografini kaldir
              </button>
            ) : null}
          </div>
          {menuImageUrl ? (
            <a
              href={menuImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={menuImageUrl} alt="Menu onizleme" className="max-h-40 w-auto object-contain" />
            </a>
          ) : null}
          {uploadingMenu ? <p className="mt-2 text-xs text-content-muted">Menu fotografi yukleniyor...</p> : null}
        </div>

        {settings?.public_preview ? (
          <div className="rounded-lg border border-border bg-surface/70 p-3">
            <p className="text-xs text-content-muted">Onizleme (musteri gorunumu)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {settings.public_preview.has_own_courier ? (
                <span className="text-xs text-sky-200">🛵 Kendi kurye</span>
              ) : null}
              {settings.public_preview.direct_order_text ? (
                <span className="text-xs text-success">{settings.public_preview.direct_order_text}</span>
              ) : null}
              {settings.public_preview.instagram_url ? (
                <span className="inline-flex items-center gap-1 text-xs text-pink-200">
                  <InstagramIcon className="h-3 w-3" /> Instagram
                </span>
              ) : null}
              {settings.public_preview.card_cover_image_url ? (
                <span className="text-xs text-brand-gold">🖼️ Kart kapak</span>
              ) : null}
              {settings.public_preview.menu_image_url ? (
                <span className="text-xs text-content-muted">📋 Menu (detay)</span>
              ) : null}
              {settings.public_preview.direct_order_url ? (
                <span className="text-xs text-content-muted">🌐 Web</span>
              ) : null}
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="btn-primary btn-sm disabled:opacity-50">
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
        {uploadingMenu || uploadingCover ? (
          <p className="text-xs text-content-muted">Fotograf yukleniyor...</p>
        ) : null}
      </form>

      {message ? <p className="mt-3 text-sm text-success">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </section>
  );
}
