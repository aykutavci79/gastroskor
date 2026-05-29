'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { FeedbackStatusBadge } from '@/components/feedback/FeedbackStatusBadge';
import { usePanel } from '@/components/panel/PanelContext';
import { listPanelPrivateFeedbacks } from '@/lib/api';
import type { PrivateFeedback } from '@/lib/types';

type Props = {
  initialRestaurantId?: string;
};

export function FeedbackListPage({ initialRestaurantId = '' }: Props) {
  const { userEmail, access } = usePanel();
  const restaurantId = (initialRestaurantId || access?.restaurant_id || '').trim();
  const [items, setItems] = useState<PrivateFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    if (!userEmail || !restaurantId) {
      setError('Restoran baglantisi bulunamadi.');
      setItems([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const rows = await listPanelPrivateFeedbacks({
        actor_user_email: userEmail,
        actor_restaurant_id: restaurantId,
        limit: 100,
      });
      setItems(rows);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Feedback listesi alinamadi.';
      setError(message);
      setItems([]);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, userEmail]);

  useEffect(() => {
    if (userEmail && restaurantId && access?.can_access_panel) {
      void fetchList();
    }
  }, [access?.can_access_panel, fetchList, restaurantId, userEmail]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-6">
        <h1 className="text-2xl font-semibold text-white">Ozel Sikayetler</h1>
        <p className="mt-1 text-sm text-slate-400">
          Musteri sikayetlerini okuyun; tam panelde cevaplayip kupon verebilirsiniz.
        </p>
        <button
          type="button"
          onClick={() => void fetchList()}
          disabled={isLoading}
          className="mt-4 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950">
          {isLoading ? 'Yukleniyor...' : 'Listeyi yenile'}
        </button>
      </section>

      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}

      <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4">
        {isLoading ? (
          <p className="text-sm text-slate-300">Yukleniyor...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-400">Henuz sikayet yok.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const detailHref = `/panel/feedback/${item.id}?restaurant_id=${encodeURIComponent(restaurantId)}`;
              return (
                <Link
                  key={item.id}
                  href={detailHref}
                  className="block rounded-xl border border-slate-700/70 bg-slate-950/70 p-4 transition hover:border-emerald-500/40">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.category}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(item.created_at).toLocaleString('tr-TR')}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-300">{item.message}</p>
                    </div>
                    <FeedbackStatusBadge status={item.status} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
