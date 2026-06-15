import { useFocusEffect } from '@react-navigation/native';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { useSession } from '@/context/session-context';
import { listDmInbox, listFriendRequests, listUserNotifications, listUserOrders } from '@/lib/api';

type AppBadges = {
  dmUnread: number;
  notificationUnread: number;
  takipPending: number;
  ordersPending: number;
  refresh: () => Promise<void>;
};

const AppBadgesContext = createContext<AppBadges | null>(null);

export function AppBadgesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const [dmUnread, setDmUnread] = useState(0);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const [takipPending, setTakipPending] = useState(0);
  const [ordersPending, setOrdersPending] = useState(0);

  const refresh = useCallback(async () => {
    const email = user?.email?.trim().toLowerCase();
    if (!email) {
      setDmUnread(0);
      setNotificationUnread(0);
      setTakipPending(0);
      setOrdersPending(0);
      return;
    }
    const [dm, notif, requests, orders] = await Promise.all([
      listDmInbox(email).catch(() => ({ unread_total: 0 })),
      listUserNotifications(email).catch(() => ({ unread_count: 0 })),
      listFriendRequests(email).catch(() => ({ incoming: [], total_pending: 0 })),
      listUserOrders(email, { limit: 1 }).catch(() => ({ pending_count: 0 })),
    ]);
    setDmUnread(dm.unread_total ?? 0);
    setNotificationUnread(notif.unread_count ?? 0);
    setTakipPending(requests.incoming?.length ?? requests.total_pending ?? 0);
    setOrdersPending(orders.pending_count ?? 0);
  }, [user?.email]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const value = useMemo(
    () => ({ dmUnread, notificationUnread, takipPending, ordersPending, refresh }),
    [dmUnread, notificationUnread, takipPending, ordersPending, refresh],
  );

  return <AppBadgesContext.Provider value={value}>{children}</AppBadgesContext.Provider>;
}

export function useAppBadges(): AppBadges {
  const ctx = useContext(AppBadgesContext);
  if (!ctx) {
    return {
      dmUnread: 0,
      notificationUnread: 0,
      takipPending: 0,
      ordersPending: 0,
      refresh: async () => undefined,
    };
  }
  return ctx;
}
