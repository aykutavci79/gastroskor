'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { usePanel } from '@/components/panel/PanelContext';
import { listPanelFollowers } from '@/lib/api';
import type { PanelFollower } from '@/lib/types';

export function PanelFollowers() {
  const { userEmail, access } = usePanel();
  const [items, setItems] = useState<PanelFollower[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userEmail) return;
    setLoading(true);
    setError(null);
    listPanelFollowers(userEmail)
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Liste yuklenemedi'))
      .finally(() => setLoading(false));
  }, [userEmail]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="rounded-2xl border border-border/70 bg-surface-input p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-content">Takipçiler</h2>
          <p className="mt-1 text-sm text-content-muted">
            {access?.restaurant_name ?? 'İşletmenizi'} GastroSkor’da takip eden üyeler.
          </p>
        </div>
        <Link href="/panel#follower-coupons" className="text-sm font-semibold text-accent hover:underline">
          Takipçi kuponları →
        </Link>
      </div>

      {loading ? <p className="mt-4 text-sm text-content-muted">Yükleniyor…</p> : null}
      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

      {!loading && !error ? (
        <p className="mt-3 text-sm text-content-muted">Toplam {total} takipçi</p>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <p className="mt-4 text-sm text-content-muted">Henüz takipçi yok. Mobil uygulamada Takip et ile gelir.</p>
      ) : null}

      <ul className="mt-4 space-y-2">
        {items.map((row) => (
          <li
            key={row.user_id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-surface px-4 py-3">
            <div>
              <p className="font-medium text-content">{row.display_name ?? 'GastroSkor üyesi'}</p>
              <p className="text-xs text-content-muted">{row.email_masked}</p>
              <p className="mt-1 text-xs text-content-muted">
                {new Date(row.followed_at).toLocaleString('tr-TR')}
              </p>
            </div>
            {row.has_active_coupon && row.coupon_code ? (
              <div className="text-right text-sm">
                <p className="font-semibold text-brand-gold">{row.coupon_code}</p>
                {row.coupon_discount_percent != null ? (
                  <p className="text-xs text-content-muted">%{row.coupon_discount_percent} aktif kupon</p>
                ) : null}
              </div>
            ) : (
              <span className="text-xs text-content-muted">Kupon yok</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
