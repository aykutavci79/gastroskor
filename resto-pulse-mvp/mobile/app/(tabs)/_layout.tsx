import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { GastroColors } from '@/constants/theme';
import { useSession } from '@/context/session-context';
import { getPanelAccess } from '@/lib/api';

export default function TabLayout() {
  const { user, loading: sessionLoading } = useSession();
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
      if (!user?.email) return;
      getPanelAccess(user.email)
        .then((access) => setHasBusiness(Boolean(access.has_ownership)))
        .catch(() => setHasBusiness(false));
    }, [user?.email]),
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
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Keşfet',
          tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
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
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
