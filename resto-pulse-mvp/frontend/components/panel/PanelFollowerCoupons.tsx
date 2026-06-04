'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

import {
  createPanelFollowerPromotion,
  listPanelFollowerPromotions,
  redeemPanelFollowerCoupon,
} from '@/lib/api';
import type { FollowerPromotion } from '@/lib/types';

type Props = {
  userEmail: string;
  canWrite: boolean;
};

export function PanelFollowerCoupons({ userEmail, canWrite }: Props) {
  const [promotions, setPromotions] = useState<FollowerPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('Takipçi indirimi');
  const [discount, setDiscount] = useState(15);
  const [validDays, setValidDays] = useState(14);
  const [maxCoupons, setMaxCoupons] = useState(100);
  const [creating, setCreating] = useState(false);

  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    listPanelFollowerPromotions(userEmail)
      .then(setPromotions)
      .catch((err) => setError(err instanceof Error ? err.message : 'Kampanyalar yuklenemedi'))
      .finally(() => setLoading(false));
  }, [userEmail]);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!canWrite) return;
    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      await createPanelFollowerPromotion({
        user_email: userEmail,
        title: title.trim(),
        discount_percent: discount,
        valid_days: validDays,
        max_coupons: maxCoupons,
      });
      setMessage('Kampanya olusturuldu; mevcut takipcilere kuponlar uretildi.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kampanya olusturulamadi');
    } finally {
      setCreating(false);
    }
  }

  async function onRedeem(event: FormEvent) {
    event.preventDefault();
    if (!canWrite || !redeemCode.trim()) return;
    setRedeeming(true);
    setError(null);
    setMessage(null);
    try {
      const result = await redeemPanelFollowerCoupon({
        user_email: userEmail,
        code: redeemCode.trim(),
      });
      setMessage(result.message);
      setRedeemCode('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kupon dogrulanamadi');
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border/70 bg-surface-input p-5">
      <h2 className="text-lg font-semibold text-content">Takipçi kuponları</h2>
      <p className="mt-1 text-sm text-content-muted">
        Her takipçiye benzersiz <strong className="text-content">GS-…</strong> kodu. Kasada kodu girince tek
        kullanımlık olarak kapanır.
      </p>

      {loading ? <p className="mt-3 text-sm text-content-muted">Yükleniyor…</p> : null}

      {canWrite ? (
        <form onSubmit={onCreate} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            <span className="text-content-muted">Kampanya adı</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-content"
            />
          </label>
          <label className="text-sm">
            <span className="text-content-muted">İndirim %</span>
            <input
              type="number"
              min={5}
              max={50}
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-content"
            />
          </label>
          <label className="text-sm">
            <span className="text-content-muted">Geçerlilik (gün)</span>
            <input
              type="number"
              min={1}
              max={90}
              value={validDays}
              onChange={(e) => setValidDays(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-content"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-content-muted">Max kupon (takipçi üst sınırı)</span>
            <input
              type="number"
              min={1}
              max={500}
              value={maxCoupons}
              onChange={(e) => setMaxCoupons(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-content"
            />
          </label>
          <button type="submit" disabled={creating} className="btn-primary sm:col-span-2">
            {creating ? 'Oluşturuluyor…' : 'Takipçilere kampanya başlat'}
          </button>
        </form>
      ) : (
        <p className="mt-3 text-sm text-brand-gold">Kampanya ve kupon onayı için tam panel gerekir.</p>
      )}

      <form onSubmit={onRedeem} className="mt-6 flex flex-col gap-2 sm:flex-row">
        <input
          value={redeemCode}
          onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
          placeholder="GS-XXXXXXXX"
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm uppercase text-content"
          disabled={!canWrite}
        />
        <button type="submit" disabled={!canWrite || redeeming} className="btn-primary shrink-0">
          {redeeming ? 'Kontrol…' : 'Kuponu kullanıldı işaretle'}
        </button>
      </form>

      {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

      {promotions.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {promotions.map((p) => (
            <li key={p.id} className="rounded-xl border border-border/60 bg-surface/60 px-3 py-2 text-sm">
              <div className="font-medium text-content">
                {p.title} · %{p.discount_percent}
              </div>
              <div className="text-content-muted">
                {p.issued_count}/{p.max_coupons} kupon · {p.redeemed_count} kullanıldı · bitiş{' '}
                {new Date(p.valid_until).toLocaleDateString('tr-TR')}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
