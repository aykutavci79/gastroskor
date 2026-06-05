'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import {
  listPanelNotifications,
  markPanelNotificationClick,
  markPanelNotificationOpen,
} from '@/lib/api';
import type { PanelNotification } from '@/lib/types';

type Props = {
  userEmail: string;
};

/** Eski bildirimlerde /panel/panel ve canli URL + local panel uyumu. */
function resolvePanelCtaUrl(ctaUrl: string): string {
  try {
    const parsed = new URL(ctaUrl, window.location.origin);
    parsed.pathname = parsed.pathname.replace(/\/panel\/panel\/?$/i, '/panel');
    const onLocal =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (onLocal) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return parsed.toString();
  } catch {
    return ctaUrl.replace(/\/panel\/panel\b/i, '/panel');
  }
}

export function PanelNotificationCenter({ userEmail }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PanelNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userEmail) return;
    setLoading(true);
    try {
      const data = await listPanelNotifications(userEmail);
      setItems(data.items);
      setUnread(data.unread_count);
    } catch {
      setItems([]);
      setUnread(0);
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function handleOpen(item: PanelNotification) {
    if (!item.opened_at) {
      try {
        await markPanelNotificationOpen(userEmail, item.id);
        setUnread((n) => Math.max(0, n - 1));
        setItems((prev) =>
          prev.map((row) => (row.id === item.id ? { ...row, opened_at: new Date().toISOString() } : row)),
        );
      } catch {
        // ignore
      }
    }
  }

  async function handleClick(item: PanelNotification) {
    await handleOpen(item);
    try {
      await markPanelNotificationClick(userEmail, item.id);
    } catch {
      // ignore
    }
    if (item.cta_url) {
      const target = resolvePanelCtaUrl(item.cta_url);
      if (target.startsWith('http')) {
        window.open(target, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = target;
      }
    }
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void refresh();
        }}
        className="relative rounded-lg border border-border px-3 py-1.5 text-xs text-content-muted hover:bg-surface-input">
        Bildirimler
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface-card shadow-card">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-content">Bildirimler</p>
            <p className="text-xs text-content-muted">{unread} okunmamis</p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? <p className="p-4 text-sm text-content-muted">Yukleniyor...</p> : null}
            {!loading && items.length === 0 ? (
              <p className="p-4 text-sm text-content-muted">Henuz bildirim yok.</p>
            ) : null}
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void handleClick(item)}
                className={`block w-full border-b border-border/60 px-4 py-3 text-left transition hover:bg-surface-input ${
                  item.opened_at ? 'opacity-80' : 'bg-accent/5'
                }`}>
                <p className="text-sm font-semibold text-content">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-content-muted">{item.message}</p>
                {item.cta_label ? (
                  <span className="mt-2 inline-block text-xs font-semibold text-accent">{item.cta_label}</span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="border-t border-border px-4 py-2 text-right">
            <Link href="/panel#notification-settings" className="text-xs text-accent hover:underline" onClick={() => setOpen(false)}>
              Bildirim ayarlari
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
