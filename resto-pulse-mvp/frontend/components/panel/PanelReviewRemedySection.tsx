'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

import { issuePanelReviewRemedyOffer, listPanelPendingReviewRemedies } from '@/lib/api';
import type { ReviewRemedyPendingItem } from '@/lib/types';

type Props = {
  userEmail: string;
  canWrite: boolean;
};

export function PanelReviewRemedySection({ userEmail, canWrite }: Props) {
  const [items, setItems] = useState<ReviewRemedyPendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [discountByReview, setDiscountByReview] = useState<Record<string, string>>({});
  const [messageByReview, setMessageByReview] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listPanelPendingReviewRemedies(userEmail);
      setItems(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Telafi listesi yuklenemedi');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(event: FormEvent, reviewId: string) {
    event.preventDefault();
    if (!canWrite) return;
    const raw = discountByReview[reviewId] ?? '15';
    const discount = Number(raw);
    if (!Number.isFinite(discount) || discount < 5 || discount > 100) {
      setError('Indirim %5 ile %100 arasinda olmali');
      return;
    }
    setSubmittingId(reviewId);
    setError(null);
    try {
      await issuePanelReviewRemedyOffer({
        user_email: userEmail,
        review_id: reviewId,
        discount_percent: discount,
        offer_message: messageByReview[reviewId]?.trim() || undefined,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Telafi teklifi gonderilemedi');
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <section id="remedy" className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
      <h2 className="text-lg font-semibold text-content">Olumsuz yorum — telafi (24 saat)</h2>
      <p className="mt-1 text-sm text-content-muted">
        Dusuk puanli geri bildirimler once size duser. 24 saat icinde telafi sunarsaniz musteri kabul ederse yorum
        kamuya yayinlanmaz.
      </p>
      {loading ? <p className="mt-4 text-sm text-content-muted">Yukleniyor...</p> : null}
      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      {!loading && items.length === 0 ? (
        <p className="mt-4 text-sm text-content-muted">Bekleyen olumsuz geri bildirim yok.</p>
      ) : null}
      <div className="mt-4 space-y-4">
        {items.map((item) => (
          <article key={item.review_id} className="rounded-xl border border-border/70 bg-surface-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-content">
                  {item.rating} yildiz · {item.restaurant_name ?? 'Restoran'}
                </p>
                <p className="mt-1 text-sm text-content-muted line-clamp-3">{item.review_text}</p>
              </div>
              {item.remedy_restaurant_deadline_at ? (
                <p className="text-xs text-amber-200">
                  Son teklif: {new Date(item.remedy_restaurant_deadline_at).toLocaleString('tr-TR')}
                </p>
              ) : null}
            </div>
            {canWrite ? (
              <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={(e) => void onSubmit(e, item.review_id)}>
                <label className="text-sm text-content-muted">
                  Indirim %
                  <input
                    type="number"
                    min={5}
                    max={100}
                    className="mt-1 block w-24 rounded-lg border border-border bg-surface-input px-2 py-1 text-content"
                    value={discountByReview[item.review_id] ?? '15'}
                    onChange={(e) =>
                      setDiscountByReview((prev) => ({ ...prev, [item.review_id]: e.target.value }))
                    }
                  />
                </label>
                <label className="min-w-[200px] flex-1 text-sm text-content-muted">
                  Kisa mesaj (opsiyonel)
                  <input
                    type="text"
                    maxLength={500}
                    className="mt-1 block w-full rounded-lg border border-border bg-surface-input px-2 py-1 text-content"
                    value={messageByReview[item.review_id] ?? ''}
                    onChange={(e) =>
                      setMessageByReview((prev) => ({ ...prev, [item.review_id]: e.target.value }))
                    }
                    placeholder="Ozur dileriz, bir sonraki ziyarette gecerli..."
                  />
                </label>
                <button
                  type="submit"
                  disabled={submittingId === item.review_id}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {submittingId === item.review_id ? 'Gonderiliyor...' : 'Telafi teklifi gonder'}
                </button>
              </form>
            ) : (
              <p className="mt-2 text-xs text-content-muted">Telafi sunmak icin tam panel yetkisi gerekir.</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
