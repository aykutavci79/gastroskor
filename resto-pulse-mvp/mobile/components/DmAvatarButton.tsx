import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { UserAvatar } from '@/components/UserAvatar';
import { GastroColors } from '@/constants/theme';
import { useAppBadges } from '@/context/app-badges-context';
import { useSession } from '@/context/session-context';

type Props = {
  size?: number;
};

export function DmAvatarButton({ size = 36 }: Props) {
  const router = useRouter();
  const { user } = useSession();
  const { dmUnread } = useAppBadges();

  function openInbox() {
    if (!user?.email) {
      router.push('/(tabs)/profil' as never);
      return;
    }
    router.push('/dm/inbox' as never);
  }

  const badgeLabel = dmUnread > 9 ? '9+' : String(dmUnread);

  return (
    <Pressable
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
      onPress={openInbox}
      accessibilityLabel="Ozel mesajlar"
      hitSlop={8}>
      {user?.email ? (
        <UserAvatar
          avatarUrl={user.avatarUrl}
          avatarPreset={user.avatarPreset}
          size={size}
          fallbackLabel={user.nickname ?? user.fullName ?? user.email}
        />
      ) : (
        <View style={[styles.guestIcon, { width: size, height: size, borderRadius: size / 2 }]}>
          <Ionicons name="mail-outline" size={Math.round(size * 0.5)} color={GastroColors.muted} />
        </View>
      )}
      {dmUnread > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  pressed: { opacity: 0.85 },
  guestIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.input,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: GastroColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: GastroColors.bg,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
