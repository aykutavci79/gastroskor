import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GastroColors } from '@/constants/theme';
import { useAppBadges } from '@/context/app-badges-context';
import { listUserNotifications, markUserNotificationRead } from '@/lib/api';
import { notificationOpenPath } from '@/lib/notification-open-path';
import type { UserNotification } from '@/lib/types';

type Props = {
  userEmail: string;
  /** Hesap ekraninda ust baslik gizlenir; liste toggle altinda kalir. */
  embedded?: boolean;
  onUnreadChange?: (count: number) => void;
};

export function UserNotificationsSection({
  userEmail,
  embedded = false,
  onUnreadChange,
}: Props) {
  const router = useRouter();
  const { refresh: refreshBadges } = useAppBadges();
  const [items, setItems] = useState<UserNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    listUserNotifications(userEmail)
      .then((data) => {
        setItems(data.items);
        setUnread(data.unread_count);
        onUnreadChange?.(data.unread_count);
      })
      .catch(() => {
        setItems([]);
        setUnread(0);
        onUnreadChange?.(0);
      })
      .finally(() => setLoading(false));
  }, [userEmail, onUnreadChange]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function onOpen(item: UserNotification) {
    try {
      await markUserNotificationRead(userEmail, item.id);
      setUnread((n) => {
        const next = Math.max(0, n - 1);
        onUnreadChange?.(next);
        return next;
      });
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row,
        ),
      );
      void refreshBadges();
    } catch {
      /* ignore */
    }
    const path = notificationOpenPath(item.metadata ?? undefined);
    if (path) {
      router.push(path as never);
    }
  }

  return (
    <View style={embedded ? styles.embedded : styles.box}>
      {!embedded ? (
        <>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Bildirimler</Text>
            {unread > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.muted}>
            Yorum cevaplari, begeniler, takipci kuponlari ve kampanyalar.
          </Text>
        </>
      ) : null}

      {loading ? (
        <Text style={styles.muted}>Bildirimler yukleniyor…</Text>
      ) : items.length === 0 ? (
        <Text style={styles.muted}>Henuz bildirim yok.</Text>
      ) : (
        items.slice(0, embedded ? 12 : 8).map((item) => (
          <Pressable
            key={item.id}
            style={[styles.row, !item.read_at ? styles.rowUnread : null]}
            onPress={() => void onOpen(item)}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowMsg} numberOfLines={2}>
              {item.message}
            </Text>
            <Text style={styles.rowDate}>{new Date(item.created_at).toLocaleString('tr-TR')}</Text>
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    padding: 14,
    gap: 8,
  },
  embedded: { gap: 8, marginTop: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: GastroColors.text, fontSize: 16, fontWeight: '700' },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: GastroColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  muted: { color: GastroColors.muted, fontSize: 12 },
  row: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GastroColors.border,
    padding: 10,
    gap: 4,
  },
  rowUnread: { borderColor: GastroColors.gold, backgroundColor: 'rgba(255, 183, 3, 0.08)' },
  rowTitle: { color: GastroColors.text, fontSize: 14, fontWeight: '700' },
  rowMsg: { color: GastroColors.muted, fontSize: 12, lineHeight: 17 },
  rowDate: { color: GastroColors.muted, fontSize: 10 },
});
