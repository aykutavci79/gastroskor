import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FriendsSection } from '@/components/FriendsSection';
import { FollowingRestaurantsSection } from '@/components/FollowingRestaurantsSection';
import { TabScreenHeader } from '@/components/TabScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { GastroColors } from '@/constants/theme';
import { useAppBadges } from '@/context/app-badges-context';
import { useSession } from '@/context/session-context';

type SubTab = 'restoran' | 'arkadas';

export default function TakipScreen() {
  const { user } = useSession();
  const { takipPending } = useAppBadges();
  const [subTab, setSubTab] = useState<SubTab>('restoran');

  return (
    <Screen scroll={Boolean(user?.email)}>
      <TabScreenHeader
        title="Takip"
        subtitle="Takip ettigin mekanlar ve arkadaslarin."
        showDmAvatar
      />

      {!user?.email ? (
        <View style={styles.guestCard}>
          <Text style={styles.guestTitle}>Giris gerekli</Text>
          <Text style={styles.guestSub}>
            Restoran takibi ve arkadas listesi icin Hesap sekmesinden giris yap.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, subTab === 'restoran' && styles.tabActive]}
              onPress={() => setSubTab('restoran')}>
              <Text style={[styles.tabText, subTab === 'restoran' && styles.tabTextActive]}>
                Restoranlar
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, subTab === 'arkadas' && styles.tabActive]}
              onPress={() => setSubTab('arkadas')}>
              <Text style={[styles.tabText, subTab === 'arkadas' && styles.tabTextActive]}>
                Arkadaslar
              </Text>
              {takipPending > 0 ? (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>
                    {takipPending > 9 ? '9+' : takipPending}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>

          {subTab === 'restoran' ? (
            <FollowingRestaurantsSection userEmail={user.email} compact />
          ) : (
            <FriendsSection userEmail={user.email} compact />
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  guestCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    padding: 16,
    gap: 8,
  },
  guestTitle: { color: GastroColors.text, fontSize: 16, fontWeight: '800' },
  guestSub: { color: GastroColors.muted, fontSize: 13, lineHeight: 18 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
  },
  tabActive: {
    borderColor: GastroColors.accent,
    backgroundColor: GastroColors.accentSoft,
  },
  tabText: { color: GastroColors.muted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: GastroColors.text, fontWeight: '800' },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: GastroColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
