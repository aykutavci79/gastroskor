import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { CenterMicTabBar } from '@/components/CenterMicTabBar';
import { EglenceTabIcon } from '@/components/eglence/EglenceTabIcon';
import { KesfetTabIcon } from '@/components/tab-bar/KesfetTabIcon';
import { TakipTabIcon } from '@/components/tab-bar/TakipTabIcon';
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
  const { t } = useTranslation();

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
          title: t('nav.explore'),
          tabBarActiveTintColor: '#4DA3FF',
          tabBarIcon: ({ focused, size }) => <KesfetTabIcon focused={focused} size={size} />,
        }}
      />
      <Tabs.Screen
        name="eglence"
        options={{
          title: t('nav.entertainment'),
          tabBarActiveTintColor: '#FFAA3C',
          tabBarIcon: ({ focused, size }) => <EglenceTabIcon focused={focused} size={size} />,
        }}
      />
      <Tabs.Screen
        name="takip"
        options={{
          title: t('nav.follow'),
          tabBarActiveTintColor: '#EF4444',
          tabBarBadge: badgeLabel(takipPending),
          tabBarIcon: ({ focused, size }) => <TakipTabIcon focused={focused} size={size} />,
        }}
      />
      <Tabs.Screen
        name="panel"
        options={{
          title: t('nav.business'),
          href: null,
          tabBarIcon: ({ color, size }) => <Ionicons name="storefront" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: t('nav.account'),
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
