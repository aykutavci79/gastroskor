import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { devLogin } from '@/lib/api';
import { getApiBase } from '@/lib/api-base';
import { isExpoGo } from '@/lib/google-signin-config';
import { useSession } from '@/context/session-context';

type Props = {
  title?: string;
  compact?: boolean;
};

/** Expo Go / __DEV__ — Google yerine gelistirici JWT oturumu. */
export function ExpoGoDevSignInCard({
  title = 'Rezervasyon icin giris gerekli',
  compact = false,
}: Props) {
  const { signInWithGoogleProfile } = useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!__DEV__ && !isExpoGo) return null;

  async function onPress() {
    setPending(true);
    setError(null);
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
          ? ` Canli API (${base}) icin mobile/.env → EXPO_PUBLIC_DEV_LOGIN_SECRET ve Railway → DEV_LOGIN_SECRET eslestirin; ya da yerel backend kullanin.`
          : '';
      setError((err instanceof Error ? err.message : 'Giris basarisiz.') + hint);
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.muted}>
        Google girisi Expo Go&apos;da calismaz. Asagidaki gelistirici girisi ile test edebilirsiniz.
      </Text>
      <Pressable
        style={[styles.btn, pending && styles.btnDisabled]}
        disabled={pending}
        onPress={() => void onPress()}>
        {pending ? (
          <ActivityIndicator color="#0f172a" />
        ) : (
          <Text style={styles.btnText}>Gelistirici girisi (Expo Go)</Text>
        )}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.45)',
    backgroundColor: 'rgba(59,130,246,0.12)',
    padding: 14,
    gap: 8,
    marginBottom: 4,
  },
  cardCompact: { marginBottom: 0 },
  title: { color: '#fff', fontWeight: '700', fontSize: 15 },
  muted: { color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 18 },
  btn: {
    marginTop: 4,
    backgroundColor: '#60a5fa',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 46,
    justifyContent: 'center',
  },
  btnText: { color: '#0f172a', fontWeight: '700', fontSize: 14 },
  btnDisabled: { opacity: 0.65 },
  error: { color: '#fca5a5', fontSize: 12, lineHeight: 17 },
});
