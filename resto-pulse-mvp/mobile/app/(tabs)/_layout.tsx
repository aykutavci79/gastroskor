import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { GastroColors } from '@/constants/theme';
import { GourmetProfileGate } from '@/components/GourmetProfileGate';
import { AppBadgesProvider, useAppBadges } from '@/context/app-badges-context';
import { useSession } from '@/context/session-context';
import { getPanelAccess } from '@/lib/api';

function badgeLabel(count: number): string | undefined {
  if (count <= 0) return undefined;
  return count > 9 ? '9+' : String(count);
}

function TabsWithBadges() {
  const { user, loading: sessionLoading } = useSession();
  const { notificationUnread, takipPending, refresh } = useAppBadges();
  const [hasBusiness, setHasBusiness] = useState(false);

  useEffect(() => {
    if (!user?.email) {
      setHasBusiness(false);
      return;
    }
    let cancelled = false;
    getPanelAccess(user.email)
      .then((access) => {
        if (!cancelled) setHasBusiness(Boolean(access.has_ownership));
      })
      .catch(() => {
        if (!cancelled) setHasBusiness(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      if (!user?.email) return;
      getPanelAccess(user.email)
        .then((access) => setHasBusiness(Boolean(access.has_ownership)))
        .catch(() => setHasBusiness(false));
    }, [refresh, user?.email]),
  );

  const showBusinessTab = Boolean(user?.email && hasBusiness && !sessionLoading);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: GastroColors.panel,
          borderTopColor: GastroColors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: GastroColors.accent,
        tabBarInactiveTintColor: GastroColors.muted,
        tabBarBadgeStyle: { backgroundColor: GastroColors.accent, color: '#fff', fontSize: 10 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Keşfet',
          tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="gurme"
        options={{
          title: 'Sohbet',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="takip"
        options={{
          title: 'Takip',
          tabBarBadge: badgeLabel(takipPending),
          tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="panel"
        options={{
          title: 'İşletme',
          href: showBusinessTab ? '/panel' : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="storefront" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Hesap',
          tabBarBadge: badgeLabel(notificationUnread),
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <>
      <GourmetProfileGate />
      <AppBadgesProvider>
        <TabsWithBadges />
      </AppBadgesProvider>
    </>
  );
}
