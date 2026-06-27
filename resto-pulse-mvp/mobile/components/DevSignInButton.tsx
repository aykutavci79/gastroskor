import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { devLogin } from '@/lib/api';
import { getApiBase } from '@/lib/api-base';
import { isExpoGo } from '@/lib/google-signin-config';
import { GastroCoinTheme } from '@/constants/gastrocoin-theme';
import { useSession } from '@/context/session-context';

type Props = {
  onError: (message: string) => void;
};

/** Expo Go / __DEV__ — Google yerine yerel dev JWT oturumu. Production API'de calismaz. */
export function DevSignInButton({ onError }: Props) {
  const { signInWithGoogleProfile } = useSession();
  const [pending, setPending] = useState(false);

  if (!__DEV__ && !isExpoGo) return null;

  async function onPress() {
    setPending(true);
    try {
      const { profile, access_token, refresh_token } = await devLogin();
      await signInWithGoogleProfile(
        profile,
        profile.google_sub ?? 'dev:gastroskor.local',
        access_token,
        refresh_token,
      );
    } catch (err) {
      const base = getApiBase();
      const hint =
        err instanceof Error && /404|Not found/i.test(err.message)
          ? ` Canli API (${base}) icin EXPO_PUBLIC_DEV_LOGIN_SECRET + Railway DEV_LOGIN_SECRET; ya da yerel backend.`
          : '';
      onError(
        (err instanceof Error ? err.message : 'Gelistirici girisi basarisiz.') + hint,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Pressable
      style={[styles.btn, pending && styles.btnDisabled]}
      disabled={pending}
      onPress={() => void onPress()}>
      {pending ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.btnText}>Gelistirici girisi (Expo Go)</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    marginTop: 10,
    backgroundColor: GastroCoinTheme.navy,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 46,
    justifyContent: 'center',
  },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  btnDisabled: { opacity: 0.6 },
});
