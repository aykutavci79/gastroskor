'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { FeedbackStatusBadge } from '@/components/feedback/FeedbackStatusBadge';
import { listPanelPrivateFeedbacks, seedPanelDemo } from '@/lib/api';
import type { PrivateFeedback } from '@/lib/types';

/** Panel listesi her zaman bu demo aktörle çalışır (Google oturumu karışmasın) */
const PANEL_ACTOR_EMAIL = 'restaurant-actor@example.com';

type Props = {
  initialRestaurantId?: string;
};

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function FeedbackListPage({ initialRestaurantId = '' }: Props) {
  const [restaurantId, setRestaurantId] = useState(initialRestaurantId.trim());
  const [items, setItems] = useState<PrivateFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastFetchInfo, setLastFetchInfo] = useState<string | null>(null);

  const fetchList = useCallback(
    async (targetRestaurantId?: string) => {
      const resolvedRestaurantId = (targetRestaurantId ?? restaurantId).trim();
      if (!resolvedRestaurantId || !isValidUuid(resolvedRestaurantId)) {
        setError('Önce "Demo verileri oluştur" butonuna basın veya geçerli restaurant_id girin.');
        setItems([]);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const rows = await listPanelPrivateFeedbacks({
          actor_user_email: PANEL_ACTOR_EMAIL,
          actor_restaurant_id: resolvedRestaurantId,
          limit: 100,
        });
        setItems(rows);
        setLastFetchInfo(`${rows.length} kayıt · ${PANEL_ACTOR_EMAIL}`);
        if (rows.length === 0) {
          setError('Kayıt yok. "Demo verileri oluştur" ile örnek şikayetleri ekleyin.');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Feedback listesi alınamadı.';
        const friendly = message.toLowerCase().includes('failed to fetch')
          ? 'Backend bağlantısı yok. uvicorn (port 8000) çalışıyor mu?'
          : message;
        setError(friendly);
        setItems([]);
        toast.error(friendly);
      } finally {
        setIsLoading(false);
      }
    },
    [restaurantId],
  );

  async function loadDemoData() {
    setIsSeeding(true);
    setError(null);
    setStatusMessage('Demo verileri oluşturuluyor...');
    try {
      const result = await seedPanelDemo();
      setStatusMessage(`Seed tamam: ${result.restaurant_name} · ${result.open_count} açık şikayet`);
      setRestaurantId(result.restaurant_id);
      setStatusMessage('Liste yükleniyor...');
      await fetchList(result.restaurant_id);
      toast.success(
        `${result.restaurant_name}: ${result.open_count} açık şikayet (${result.created} yeni eklendi)`,
      );
      setStatusMessage(`Hazır — ${result.open_count} kayıt listelendi.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Demo verileri oluşturulamadı.';
      const friendly = message.toLowerCase().includes('failed to fetch') || message.includes('baglantisi')
        ? 'Backend bağlantısı yok. Backend klasöründe: uvicorn app.main:app --reload --port 8000'
        : message;
      setError(friendly);
      setStatusMessage(`Hata: ${friendly}`);
      toast.error(friendly);
    } finally {
      setIsSeeding(false);
    }
  }

  useEffect(() => {
    if (initialRestaurantId.trim() && isValidUuid(initialRestaurantId.trim())) {
      setRestaurantId(initialRestaurantId.trim());
      void fetchList(initialRestaurantId.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRestaurantId]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-6">
        <h1 className="text-2xl font-semibold text-white">Feedback Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Panel test modu: demo aktör ile çalışır. Kupon ve mesajlar detay sayfasında.
        </p>

        <p className="mt-2 text-xs text-slate-500">
          Aktör: {PANEL_ACTOR_EMAIL}
          {restaurantId ? ` · Restoran: ${restaurantId}` : ' · Restoran: henüz seçilmedi'}
          {lastFetchInfo ? ` · Son sorgu: ${lastFetchInfo}` : ''}
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <input
            value={restaurantId}
            onChange={(e) => setRestaurantId(e.target.value)}
            placeholder="restaurant_id (UUID)"
            className="min-w-[280px] flex-1 rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
          <button
            type="button"
            onClick={() => void loadDemoData()}
            disabled={isSeeding || isLoading}
            className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/20 disabled:opacity-60">
            {isSeeding ? 'Oluşturuluyor...' : 'Demo verileri oluştur'}
          </button>
          <button
            type="button"
            onClick={() => void fetchList()}
            disabled={isLoading || isSeeding}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:brightness-110 disabled:opacity-60">
            {isLoading ? 'Yükleniyor...' : 'Listeyi yenile'}
          </button>
        </div>

        <p className="mt-3 text-xs text-amber-200/90">
          İlk kullanımda önce <strong>Demo verileri oluştur</strong> butonuna basın; ardından şikayetler listelenir.
        </p>
      </section>

      {statusMessage ? (
        <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 p-4 text-sm text-sky-100">{statusMessage}</div>
      ) : null}

      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}

      <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4">
        {isLoading ? (
          <p className="text-sm text-slate-300">Yükleniyor...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-400">Henüz kayıt yok. &quot;Demo verileri oluştur&quot; ile başlayın.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const resolvedRestaurantId = item.restaurant_id ?? restaurantId;
              const detailHref = `/panel/feedback/${item.id}?restaurant_id=${encodeURIComponent(resolvedRestaurantId)}`;

              return (
                <Link
                  key={item.id}
                  href={detailHref}
                  className="block rounded-xl border border-slate-700/70 bg-slate-950/70 p-4 transition hover:border-emerald-500/40">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.category}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {item.place_id} · {new Date(item.created_at).toLocaleString('tr-TR')}
                      </p>
                      <p className="mt-2 text-sm text-slate-300 line-clamp-2">{item.message}</p>
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
