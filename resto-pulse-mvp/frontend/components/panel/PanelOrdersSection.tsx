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
      const data = await listPanelOrders(userEmail);
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
        Musteri telefonu ile gelir; onaylayinca musteri tekrar siparis verebilir. Odeme kapida. Sekme arka plandayken
        zil {Math.round(POLL_MS / 1000)} sn arayla calar.
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
          <li key={order.id} className="rounded-xl border border-brand-gold/30 bg-surface-card p-4 ring-1 ring-brand-gold/20">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-content">
                  {order.customer_name || 'Musteri'} · {order.total_tl.toFixed(0)} TL
                </p>
                <p className="text-sm text-brand-gold">{order.customer_phone}</p>
                {order.note ? <p className="mt-1 text-sm text-content-muted">Not: {order.note}</p> : null}
              </div>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-brand-gold">
                Onay bekliyor
              </span>
            </div>
            <ul className="mt-3 space-y-1 text-sm text-content-muted">
              {order.lines.map((line) => (
                <li key={line.id}>
                  {line.quantity}x {line.name} — {line.line_total_tl.toFixed(0)} TL
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busyId === order.id}
                onClick={() => void onDecision(order.id, 'accepted')}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-surface disabled:opacity-50">
                Onayla ve ara
              </button>
              <button
                type="button"
                disabled={busyId === order.id}
                onClick={() => void onDecision(order.id, 'rejected')}
                className="rounded-lg border border-border px-4 py-2 text-sm text-content-muted hover:bg-surface-input disabled:opacity-50">
                Reddet
              </button>
            </div>
          </li>
        ))}
      </ul>

      {items.some((row) => row.status !== 'pending') ? (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-content-muted">Gecmis siparisler</summary>
          <ul className="mt-3 space-y-2 text-sm text-content-muted">
            {items
              .filter((row) => row.status !== 'pending')
              .map((order) => (
                <li key={order.id}>
                  {order.status === 'accepted' ? 'Onaylandi' : 'Reddedildi'} — {order.total_tl.toFixed(0)} TL —{' '}
                  {order.customer_phone}
                </li>
              ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
