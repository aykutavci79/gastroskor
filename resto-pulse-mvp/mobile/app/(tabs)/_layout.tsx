import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { GastroColors } from '@/constants/theme';

export default function TabLayout() {
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
          title: 'Kesfet',
          tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="panel"
        options={{
          title: 'Isletme',
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
