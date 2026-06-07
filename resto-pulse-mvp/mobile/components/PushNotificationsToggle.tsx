import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { GastroColors } from '@/constants/theme';
import { useSession } from '@/context/session-context';
import {
  ensureNotificationPermissions,
  isPushNotificationsSupported,
  registerUserPushToken,
} from '@/lib/push-notifications';
import { readPushNotificationsEnabled, writePushNotificationsEnabled } from '@/lib/push-preference';

export function PushNotificationsToggle() {
  const { user } = useSession();
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const supported = isPushNotificationsSupported();

  useEffect(() => {
    void readPushNotificationsEnabled().then(setEnabled);
  }, []);

  const onToggle = useCallback(
    async (next: boolean) => {
      if (!user?.email) return;
      setBusy(true);
      try {
        if (next) {
          const granted = await ensureNotificationPermissions();
          if (!granted) {
            setEnabled(false);
            await writePushNotificationsEnabled(false);
            return;
          }
          await writePushNotificationsEnabled(true);
          setEnabled(true);
          await registerUserPushToken(user.email);
          return;
        }
        await writePushNotificationsEnabled(false);
        setEnabled(false);
      } finally {
        setBusy(false);
      }
    },
    [user?.email],
  );

  if (!user?.email) return null;

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.label}>Push bildirimleri</Text>
        <Text style={styles.hint}>
          {supported
            ? 'Arkadas istegi, kupon, yorum yaniti ve kampanyalar'
            : 'Push bildirimleri Expo Go’da calismaz; Play build gerekir.'}
        </Text>
        {!supported ? (
          <Pressable onPress={() => void Linking.openSettings()}>
            <Text style={styles.link}>Cihaz ayarlarini ac</Text>
          </Pressable>
        ) : null}
      </View>
      <Switch
        value={enabled && supported}
        onValueChange={(value) => void onToggle(value)}
        disabled={busy || !supported}
        trackColor={{ false: GastroColors.input, true: GastroColors.accentSoft }}
        thumbColor={enabled ? GastroColors.accent : GastroColors.muted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  copy: { flex: 1, gap: 4 },
  label: { color: GastroColors.text, fontSize: 14, fontWeight: '700' },
  hint: { color: GastroColors.muted, fontSize: 12, lineHeight: 17 },
  link: { color: GastroColors.accent, fontSize: 12, fontWeight: '600', marginTop: 2 },
});
