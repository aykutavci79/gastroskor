'use client';

import { useEffect, useRef } from 'react';

import {
  playPanelOrderBell,
  readPanelOrderSoundEnabled,
  showPanelOrderNotification,
  startBackgroundBellLoop,
} from '@/lib/panel-order-bell';
import type { RestaurantOrderRead } from '@/lib/types';

const POLL_MS = 10_000;

export function usePanelOrderAlerts(pending: RestaurantOrderRead[], soundEnabled: boolean) {
  const seenPendingRef = useRef<Set<string> | null>(null);
  const loopCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const ids = pending.map((row) => row.id);
    const idSet = new Set(ids);

    if (seenPendingRef.current === null) {
      seenPendingRef.current = idSet;
      return;
    }

    const newOrders = pending.filter((row) => !seenPendingRef.current!.has(row.id));
    seenPendingRef.current = idSet;

    if (!soundEnabled || newOrders.length === 0) return;

    for (const order of newOrders) {
      playPanelOrderBell();
      showPanelOrderNotification({
        id: order.id,
        customerPhone: order.customer_phone,
        totalTl: order.total_tl,
        lineCount: order.lines.length,
      });
    }

    loopCleanupRef.current?.();
    if (pending.length > 0 && document.visibilityState !== 'visible') {
      loopCleanupRef.current = startBackgroundBellLoop(() => pending.length > 0);
    }
  }, [pending, soundEnabled]);

  useEffect(() => {
    if (!soundEnabled || pending.length === 0) {
      loopCleanupRef.current?.();
      loopCleanupRef.current = null;
      return;
    }

    function syncLoop() {
      loopCleanupRef.current?.();
      if (document.visibilityState !== 'visible') {
        loopCleanupRef.current = startBackgroundBellLoop(() => pending.length > 0);
      }
    }

    syncLoop();
    document.addEventListener('visibilitychange', syncLoop);
    return () => {
      document.removeEventListener('visibilitychange', syncLoop);
      loopCleanupRef.current?.();
      loopCleanupRef.current = null;
    };
  }, [pending.length, soundEnabled]);

  return { pollMs: POLL_MS };
}

export { readPanelOrderSoundEnabled, POLL_MS as PANEL_ORDER_POLL_MS };
