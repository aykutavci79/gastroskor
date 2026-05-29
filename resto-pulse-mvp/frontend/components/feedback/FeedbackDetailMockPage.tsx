'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  FeedbackConversationPanel,
  type ConversationMessage,
} from '@/components/feedback/FeedbackConversationPanel';
import { CompensationCouponModal } from '@/components/feedback/CompensationCouponModal';
import { FeedbackStatusBadge, type FeedbackStatus } from '@/components/feedback/FeedbackStatusBadge';
import { usePanel } from '@/components/panel/PanelContext';
import {
  createCompensationCoupon,
  createFeedbackMessage,
  getPrivateFeedbackDetail,
  updatePrivateFeedbackStatus,
} from '@/lib/api';
import type { PrivateFeedbackDetail } from '@/lib/types';

type Props = {
  feedbackId: string;
  restaurantId?: string;
};

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function FeedbackDetailMockPage({ feedbackId, restaurantId }: Props) {
  const { userEmail, access } = usePanel();
  const actorEmail = userEmail ?? '';
  const resolvedRestaurantId = restaurantId ?? access?.restaurant_id ?? undefined;
  const canWrite = access?.can_write_actions ?? false;

  const [detail, setDetail] = useState<PrivateFeedbackDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCouponModalOpen, setCouponModalOpen] = useState(false);
  const [isCreatingCoupon, setCreatingCoupon] = useState(false);
  const [isMutatingStatus, setMutatingStatus] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  async function fetchDetail() {
    if (!feedbackId) {
      setError('feedbackId eksik. Geçerli bir UUID ile açın: /panel/feedback/<uuid>');
      setIsLoading(false);
      return;
    }

    if (!isValidUuid(feedbackId)) {
      setError('Geçersiz feedbackId. URL içindeki "<feedback_uuid>" yerini gerçek UUID değeriyle değiştirin.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await getPrivateFeedbackDetail(feedbackId, {
        actor_user_email: actorEmail,
        actor_restaurant_id: resolvedRestaurantId ?? detail?.feedback.restaurant_id ?? undefined,
      });
      setDetail(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Feedback detayı alınamadı.';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedbackId, actorEmail, refreshKey, resolvedRestaurantId]);

  const headerMeta = useMemo(
    () =>
      detail
        ? [
            `Kategori: ${detail.feedback.category}`,
            `Şiddet: ${detail.feedback.severity.toUpperCase()}`,
            `Ziyaret: ${
              detail.feedback.visit_at ? new Date(detail.feedback.visit_at).toLocaleString('tr-TR') : 'Belirtilmedi'
            }`,
          ]
        : [],
    [detail],
  );

  const conversationMessages: ConversationMessage[] = useMemo(
    () =>
      (detail?.messages ?? []).map((msg) => ({
        id: msg.id,
        senderType: msg.sender_type,
        senderName: msg.sender_type === 'restaurant' ? 'Restoran Yetkilisi' : 'Müşteri',
        text: msg.message,
        createdAt: msg.created_at,
      })),
    [detail],
  );

  async function updateStatus(status: 'in_review' | 'resolved' | 'rejected') {
    if (!detail?.feedback.restaurant_id) return;
    setMutatingStatus(true);
    try {
      await updatePrivateFeedbackStatus(detail.feedback.id, {
        status,
        actor_user_email: actorEmail,
        actor_restaurant_id: resolvedRestaurantId ?? detail.feedback.restaurant_id,
      });
      setRefreshKey((prev) => prev + 1);
      toast.success('Durum güncellendi.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Durum güncellenemedi.');
    } finally {
      setMutatingStatus(false);
    }
  }

  async function handleSendMessage(payload: { text: string; senderType: 'restaurant' }) {
    if (!detail?.feedback.restaurant_id) return;
    try {
      await createFeedbackMessage(detail.feedback.id, {
        sender_type: payload.senderType,
        message: payload.text,
        actor_user_email: actorEmail,
        actor_restaurant_id: resolvedRestaurantId ?? detail.feedback.restaurant_id,
      });
      setRefreshKey((prev) => prev + 1);
      toast.success('Mesaj gönderildi.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Mesaj gönderilemedi.');
    }
  }

  async function handleCreateCoupon(payload: { discountPercent: 10 | 25 | 50; expiresAt: string }) {
    if (!detail?.feedback.restaurant_id) return;
    setCreatingCoupon(true);
    try {
      await createCompensationCoupon(detail.feedback.id, {
        discount_percent: payload.discountPercent,
        expires_at: new Date(payload.expiresAt).toISOString(),
        actor_user_email: actorEmail,
        actor_restaurant_id: resolvedRestaurantId ?? detail.feedback.restaurant_id,
      });
      setRefreshKey((prev) => prev + 1);
      setCouponModalOpen(false);
      toast.success('Telafi kuponu oluşturuldu ve vaka çözüldü.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kupon oluşturulamadı.');
    } finally {
      setCreatingCoupon(false);
    }
  }

  if (isLoading) {
    return <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-6 text-slate-300">Yükleniyor...</div>;
  }

  if (error || !detail) {
    return (
      <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-rose-100">
        {error ?? 'Feedback verisi bulunamadı.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Feedback Detay</h1>
            <p className="mt-1 text-sm text-slate-400">
              {detail.feedback.restaurant_id ?? 'Restaurant bağlantısı yok'} · {detail.feedback.place_id}
            </p>
            <p className="mt-2 text-xs text-slate-500">{headerMeta.join(' · ')}</p>
          </div>
          <FeedbackStatusBadge status={detail.feedback.status} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Müşteri</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{detail.feedback.author_id}</p>
            <p className="text-xs text-slate-400">{new Date(detail.feedback.created_at).toLocaleString('tr-TR')}</p>
          </div>
          <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Aksiyonlar</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => void updateStatus('in_review')}
                disabled={isMutatingStatus || !canWrite}
                className="rounded-lg border border-sky-400/40 bg-sky-400/15 px-3 py-1.5 text-xs font-semibold text-sky-100 disabled:opacity-40">
                Incelemeye Al
              </button>
              <button
                onClick={() => void updateStatus('resolved')}
                disabled={isMutatingStatus || !canWrite}
                className="rounded-lg border border-emerald-400/40 bg-emerald-400/15 px-3 py-1.5 text-xs font-semibold text-emerald-100 disabled:opacity-40">
                Cozuldu
              </button>
              <button
                onClick={() => setCouponModalOpen(true)}
                disabled={!canWrite || !['open', 'in_review'].includes(detail.feedback.status)}
                className="rounded-lg border border-amber-400/40 bg-amber-400/15 px-3 py-1.5 text-xs font-semibold text-amber-100 disabled:opacity-40">
                Telafi Kuponu Olustur
              </button>
            </div>
            {!canWrite ? (
              <p className="mt-2 text-xs text-amber-200">Tam panel gerekir (SMS veya ziyaret sonrasi).</p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <FeedbackConversationPanel
          messages={conversationMessages}
          onSend={handleSendMessage}
          disabled={!canWrite}
        />

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Telafi Kuponu</h2>
            {detail.latest_coupon ? (
              <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
                <p className="text-xs text-slate-400">Kod</p>
                <p className="text-lg font-bold tracking-widest text-emerald-100">{detail.latest_coupon.code}</p>
                <p className="mt-1 text-sm text-slate-200">%{detail.latest_coupon.discount_percent} indirim</p>
                <p className="text-xs text-slate-400">
                  Son tarih: {new Date(detail.latest_coupon.expires_at).toLocaleString('tr-TR')}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-400">Henüz kupon oluşturulmadı.</p>
            )}
          </section>
        </aside>
      </div>

      <CompensationCouponModal
        isOpen={isCouponModalOpen}
        onClose={() => setCouponModalOpen(false)}
        onSubmit={handleCreateCoupon}
        isSubmitting={isCreatingCoupon}
      />
    </div>
  );
}

export const FeedbackDetailPage = FeedbackDetailMockPage;

