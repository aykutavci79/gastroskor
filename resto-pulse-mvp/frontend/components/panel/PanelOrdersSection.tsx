'use client';

import { useCallback, useEffect, useState } from 'react';

import { usePanelOrderAlerts } from '@/hooks/use-panel-order-alerts';
import { decidePanelOrder, listPanelOrders } from '@/lib/api';
import { ORDER_REJECT_REASONS, type OrderRejectReasonCode } from '@/lib/order-reject-reasons';
import { printRestaurantOrder } from '@/lib/order-print';
import {
  primePanelOrderAudio,
  readPanelOrderSoundEnabled,
  requestPanelOrderNotificationPermission,
  writePanelOrderSoundEnabled,
} from '@/lib/panel-order-bell';
import type { RestaurantOrderRead } from '@/lib/types';

type Props = {
  userEmail: string;
  restaurantName?: string | null;
  orderStats?: {
    total: number;
    last180Days: number;
  };
};

const POLL_MS = 10_000;
const ARCHIVE_DAYS = 7;

function formatOrderWhen(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(status: RestaurantOrderRead['status']): string {
  if (status === 'accepted') return 'Onaylandi';
  if (status === 'rejected') return 'Reddedildi';
  return 'Onay bekliyor';
}

function OrderLines({ lines }: { lines: RestaurantOrderRead['lines'] }) {
  return (
    <ul className="mt-3 space-y-1 rounded-lg bg-surface-input/80 p-3 text-sm text-content">
      {lines.map((line) => (
        <li key={line.id} className="flex flex-wrap justify-between gap-2">
          <span>
            <strong className="text-content">{line.quantity}x</strong> {line.name}
          </span>
          <span className="text-content-muted">{line.line_total_tl.toFixed(0)} TL</span>
        </li>
      ))}
    </ul>
  );
}

function OrderCard({
  order,
  variant,
  busyId,
  restaurantName,
  onDecision,
}: {
  order: RestaurantOrderRead;
  variant: 'pending' | 'history';
  busyId?: string | null;
  restaurantName: string;
  onDecision?: (orderId: string, decision: 'accepted' | 'rejected' | 'reject_open') => void;
}) {
  const isPending = variant === 'pending';
  return (
    <li
      className={
        isPending
          ? 'rounded-xl border border-brand-gold/30 bg-surface-card p-4 ring-1 ring-brand-gold/20'
          : 'rounded-xl border border-border bg-surface-card p-4'
      }>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          {order.order_number ? (
            <p className="text-xs font-bold uppercase tracking-wide text-brand-gold">No {order.order_number}</p>
          ) : null}
          <p className="font-semibold text-content">
            {order.customer_name || 'Musteri'} · {order.total_tl.toFixed(0)} TL
          </p>
          <a href={`tel:${order.customer_phone}`} className="text-sm font-semibold text-brand-gold hover:underline">
            {order.customer_phone}
          </a>
          {order.customer_address ? (
            <p className="mt-1 text-sm text-content">{order.customer_address}</p>
          ) : null}
          <p className="mt-1 text-xs text-content-muted">Siparis: {formatOrderWhen(order.created_at)}</p>
          {order.decided_at ? (
            <p className="text-xs text-content-muted">Karar: {formatOrderWhen(order.decided_at)}</p>
          ) : null}
          {order.note ? <p className="mt-2 text-sm text-content-muted">Not: {order.note}</p> : null}
          {order.payment_method_label ? (
            <p className="mt-2">
              <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-semibold text-sky-200">
                Odeme: {order.payment_method_label}
              </span>
            </p>
          ) : null}
          {order.status === 'rejected' && order.reject_message ? (
            <p className="mt-2 text-sm text-rose-200">Red sebebi: {order.reject_message}</p>
          ) : null}
        </div>
        <span
          className={
            isPending
              ? 'rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-brand-gold'
              : order.status === 'accepted'
                ? 'rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300'
                : 'rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-300'
          }>
          {statusLabel(order.status)}
        </span>
      </div>
      <OrderLines lines={order.lines} />
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => printRestaurantOrder(order, restaurantName)}
          className="rounded-lg border border-border px-4 py-2 text-sm text-content-muted hover:bg-surface-input">
          Siparis formu yazdir
        </button>
        {isPending && onDecision ? (
          <>
            <button
              type="button"
              disabled={busyId === order.id}
              onClick={() => onDecision(order.id, 'accepted')}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-surface disabled:opacity-50">
              Onayla ve ara
            </button>
            <button
              type="button"
              disabled={busyId === order.id}
              onClick={() => onDecision(order.id, 'reject_open')}
              className="rounded-lg border border-rose-500/40 px-4 py-2 text-sm text-rose-200 hover:bg-rose-500/10 disabled:opacity-50">
              Reddet
            </button>
          </>
        ) : null}
      </div>
    </li>
  );
}

function OrderRejectModal({
  order,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  order: RestaurantOrderRead;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (payload: { reject_reason_code?: string; reject_reason_text?: string }) => void;
}) {
  const [reasonCode, setReasonCode] = useState<OrderRejectReasonCode | ''>('');
  const [reasonText, setReasonText] = useState('');
  const canSubmit = Boolean(reasonCode) || reasonText.trim().length >= 3;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-order-title"
        className="w-full max-w-md rounded-2xl border border-border bg-surface-card p-5 shadow-xl">
        <h3 id="reject-order-title" className="text-lg font-semibold text-content">
          Siparisi reddet
        </h3>
        <p className="mt-1 text-sm text-content-muted">
          {order.order_number ? `No ${order.order_number} · ` : ''}
          {order.customer_name || 'Musteri'} — musteriye bildirim gidecek.
        </p>

        <p className="mt-4 text-sm font-medium text-content">Sebep secin (veya asagiya yazin)</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ORDER_REJECT_REASONS.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => setReasonCode((prev) => (prev === item.code ? '' : item.code))}
              className={
                reasonCode === item.code
                  ? 'rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-surface'
                  : 'rounded-full border border-border px-3 py-1.5 text-xs text-content-muted hover:bg-surface-input'
              }>
              {item.label}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-sm font-medium text-content" htmlFor="reject-reason-text">
          Aciklama (istege bagli)
        </label>
        <textarea
          id="reject-reason-text"
          value={reasonText}
          onChange={(event) => setReasonText(event.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Ornek: Bugun kuryemiz gelmedi, yarin tekrar deneyebilirsiniz."
          className="mt-1 w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-content"
        />
        <p className="mt-1 text-xs text-content-muted">
          Secenek isaretlemeniz veya en az 3 karakter yazmaniz yeterli.
        </p>

        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm text-content-muted hover:bg-surface-input disabled:opacity-50">
            Vazgec
          </button>
          <button
            type="button"
            disabled={busy || !canSubmit}
            onClick={() =>
              onConfirm({
                reject_reason_code: reasonCode || undefined,
                reject_reason_text: reasonText.trim() || undefined,
              })
            }
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? 'Gonderiliyor...' : 'Reddet ve bildir'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PanelOrdersSection({ userEmail, restaurantName, orderStats }: Props) {
  const [items, setItems] = useState<RestaurantOrderRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notifyPermission, setNotifyPermission] = useState<'default' | 'granted' | 'denied'>('default');
  const [rejectingOrder, setRejectingOrder] = useState<RestaurantOrderRead | null>(null);
  const [rejectError, setRejectError] = useState<string | null>(null);

  useEffect(() => {
    setSoundEnabled(readPanelOrderSoundEnabled());
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifyPermission(Notification.permission);
    }
  }, []);

  const reload = useCallback(async () => {
    try {
      const data = await listPanelOrders(userEmail, 100, ARCHIVE_DAYS);
      setItems(data.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Siparisler yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    void reload();
    const timer = window.setInterval(() => void reload(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [reload]);

  const pending = items.filter((row) => row.status === 'pending');
  const history = items.filter((row) => row.status !== 'pending');
  usePanelOrderAlerts(pending, soundEnabled);

  useEffect(() => {
    if (pending.length === 0 || typeof document === 'undefined') return;
    const base = 'GastroSkor Panel';
    if (document.visibilityState !== 'visible') {
      document.title = `(${pending.length}) Yeni siparis · ${base}`;
    }
    function onVisible() {
      if (document.visibilityState === 'visible') document.title = base;
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      document.title = base;
    };
  }, [pending.length]);

  async function onAccept(orderId: string) {
    setBusyId(orderId);
    setError(null);
    try {
      await decidePanelOrder(orderId, { user_email: userEmail, decision: 'accepted' });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Islem basarisiz');
    } finally {
      setBusyId(null);
    }
  }

  async function onRejectConfirm(payload: {
    reject_reason_code?: string;
    reject_reason_text?: string;
  }) {
    if (!rejectingOrder) return;
    setBusyId(rejectingOrder.id);
    setRejectError(null);
    setError(null);
    try {
      await decidePanelOrder(rejectingOrder.id, {
        user_email: userEmail,
        decision: 'rejected',
        reject_reason_code: payload.reject_reason_code,
        reject_reason_text: payload.reject_reason_text,
      });
      setRejectingOrder(null);
      await reload();
    } catch (err) {
      setRejectError(err instanceof Error ? err.message : 'Red islemi basarisiz');
    } finally {
      setBusyId(null);
    }
  }

  function onCardDecision(orderId: string, decision: 'accepted' | 'rejected' | 'reject_open') {
    if (decision === 'accepted') {
      void onAccept(orderId);
      return;
    }
    const order = items.find((row) => row.id === orderId);
    if (order) {
      setRejectError(null);
      setRejectingOrder(order);
    }
  }

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    writePanelOrderSoundEnabled(next);
    if (next) primePanelOrderAudio();
  }

  async function enableDesktopNotify() {
    primePanelOrderAudio();
    const ok = await requestPanelOrderNotificationPermission();
    setNotifyPermission(ok ? 'granted' : Notification.permission);
  }

  const resolvedRestaurantName = restaurantName?.trim() || 'Restoran';

  return (
    <section className="rounded-2xl border border-border/70 bg-surface-input p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-content">Online siparisler</h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-content-muted">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={toggleSound}
              className="rounded border-border"
            />
            Zil sesi
          </label>
          {notifyPermission !== 'granted' ? (
            <button
              type="button"
              onClick={() => void enableDesktopNotify()}
              className="rounded-lg border border-border px-2 py-1 text-xs text-content-muted hover:bg-surface-card">
              Masaustu bildirimi
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void reload()}
            className="rounded-lg border border-border px-3 py-1 text-xs text-content-muted hover:bg-surface-card">
            Yenile
          </button>
        </div>
      </div>
      <p className="mt-1 text-sm text-content-muted">
        Musteri telefonu ve adresi ile gelir; siparis formunu yazdirip mutfaga/kuryeye verebilirsiniz. Gunluk numara
        her gece sifirlanir (00:01–23:59). Odeme kapida. Son {ARCHIVE_DAYS} gun siparis detaylari asagida kalir.
      </p>
      {orderStats && orderStats.total > 0 ? (
        <p className="mt-2 rounded-lg border border-brand-gold/20 bg-brand-gold/5 px-3 py-2 text-sm text-content">
          GastroSkor uzerinden toplam <strong>{orderStats.total}</strong> onayli siparis
          {orderStats.last180Days !== orderStats.total ? (
            <>
              {' '}
              (son 6 ay: <strong>{orderStats.last180Days}</strong>)
            </>
          ) : null}
          .
        </p>
      ) : null}

      {loading ? <p className="mt-4 text-sm text-content-muted">Yukleniyor...</p> : null}
      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

      {!loading && pending.length === 0 ? (
        <p className="mt-4 text-sm text-content-muted">Bekleyen siparis yok.</p>
      ) : null}

      {pending.length > 0 ? (
        <p className="mt-3 text-sm font-semibold text-brand-gold">
          {pending.length} siparis onay bekliyor
        </p>
      ) : null}

      <ul className="mt-4 space-y-3">
        {pending.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            variant="pending"
            busyId={busyId}
            restaurantName={resolvedRestaurantName}
            onDecision={onCardDecision}
          />
        ))}
      </ul>

      {rejectingOrder ? (
        <OrderRejectModal
          order={rejectingOrder}
          busy={busyId === rejectingOrder.id}
          error={rejectError}
          onClose={() => {
            if (busyId === rejectingOrder.id) return;
            setRejectingOrder(null);
            setRejectError(null);
          }}
          onConfirm={(payload) => void onRejectConfirm(payload)}
        />
      ) : null}

      {history.length > 0 ? (
        <div className="mt-8 space-y-3">
          <h3 className="text-base font-semibold text-content">
            Siparis arsivi (son {ARCHIVE_DAYS} gun)
          </h3>
          <p className="text-sm text-content-muted">
            Onayladiktan sonra urun listesi ve telefon burada kalir; musteriyi tekrar aramadan hazirlayabilirsin.
          </p>
          <ul className="space-y-3">
            {history.map((order) => (
              <OrderCard key={order.id} order={order} variant="history" restaurantName={resolvedRestaurantName} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
