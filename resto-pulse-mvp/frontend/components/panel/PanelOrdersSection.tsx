'use client';

import { useCallback, useEffect, useState } from 'react';

import { usePanelOrderAlerts } from '@/hooks/use-panel-order-alerts';
import { decidePanelOrder, listPanelOrders } from '@/lib/api';
import {
  primePanelOrderAudio,
  readPanelOrderSoundEnabled,
  requestPanelOrderNotificationPermission,
  writePanelOrderSoundEnabled,
} from '@/lib/panel-order-bell';
import type { RestaurantOrderRead } from '@/lib/types';

type Props = {
  userEmail: string;
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
  onDecision,
}: {
  order: RestaurantOrderRead;
  variant: 'pending' | 'history';
  busyId?: string | null;
  onDecision?: (orderId: string, decision: 'accepted' | 'rejected') => void;
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
          <p className="font-semibold text-content">
            {order.customer_name || 'Musteri'} · {order.total_tl.toFixed(0)} TL
          </p>
          <a href={`tel:${order.customer_phone}`} className="text-sm font-semibold text-brand-gold hover:underline">
            {order.customer_phone}
          </a>
          <p className="mt-1 text-xs text-content-muted">Siparis: {formatOrderWhen(order.created_at)}</p>
          {order.decided_at ? (
            <p className="text-xs text-content-muted">Karar: {formatOrderWhen(order.decided_at)}</p>
          ) : null}
          {order.note ? <p className="mt-2 text-sm text-content-muted">Not: {order.note}</p> : null}
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
      {isPending && onDecision ? (
        <div className="mt-4 flex flex-wrap gap-2">
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
            onClick={() => onDecision(order.id, 'rejected')}
            className="rounded-lg border border-border px-4 py-2 text-sm text-content-muted hover:bg-surface-input disabled:opacity-50">
            Reddet
          </button>
        </div>
      ) : null}
    </li>
  );
}

export function PanelOrdersSection({ userEmail }: Props) {
  const [items, setItems] = useState<RestaurantOrderRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notifyPermission, setNotifyPermission] = useState<'default' | 'granted' | 'denied'>('default');

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

  async function onDecision(orderId: string, decision: 'accepted' | 'rejected') {
    setBusyId(orderId);
    setError(null);
    try {
      await decidePanelOrder(orderId, { user_email: userEmail, decision });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Islem basarisiz');
    } finally {
      setBusyId(null);
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
        Musteri telefonu ile gelir; onaylayinca musteri tekrar siparis verebilir. Odeme kapida. Son {ARCHIVE_DAYS} gun
        siparis detaylari (urun listesi) asagida kalir.
      </p>

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
            onDecision={(id, decision) => void onDecision(id, decision)}
          />
        ))}
      </ul>

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
              <OrderCard key={order.id} order={order} variant="history" />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
