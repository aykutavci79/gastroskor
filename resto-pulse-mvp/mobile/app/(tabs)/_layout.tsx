import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import { useCallback } from 'react';

import { CenterMicTabBar } from '@/components/CenterMicTabBar';
import { KesfetVoiceOverlayRoot } from '@/components/KesfetVoiceOverlayRoot';
import { useGastroTheme } from '@/context/theme-context';
import { GourmetProfileGate } from '@/components/GourmetProfileGate';
import { AppBadgesProvider, useAppBadges } from '@/context/app-badges-context';

function badgeLabel(count: number): string | undefined {
  if (count <= 0) return undefined;
  return count > 9 ? '9+' : String(count);
}

function TabsWithBadges() {
  const { colors } = useGastroTheme();
  const { notificationUnread, takipPending, refresh } = useAppBadges();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return (
    <>
    <Tabs
      tabBar={(props) => <CenterMicTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarBadgeStyle: { backgroundColor: colors.accent, color: '#fff', fontSize: 10 },
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
          href: null,
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
    <KesfetVoiceOverlayRoot />
    </>
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
