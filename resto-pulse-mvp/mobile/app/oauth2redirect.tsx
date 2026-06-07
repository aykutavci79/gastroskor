import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { GastroColors } from '@/constants/theme';
import { useSession } from '@/context/session-context';
import { parseGoogleIdToken } from '@/lib/google-auth';
import { exchangeGoogleAuthCode } from '@/lib/google-oauth-exchange';
import {
  clearGoogleOAuthPending,
  loadGoogleOAuthPending,
} from '@/lib/google-oauth-pending';

function readParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]?.trim();
  return typeof value === 'string' ? value.trim() : undefined;
}

/** Google native OAuth geri donusu — code burada islenir (Profil ekrani acik olmasa bile). */
export default function GoogleOAuthRedirectScreen() {
  const params = useLocalSearchParams<{
    code?: string | string[];
    error?: string | string[];
    error_description?: string | string[];
  }>();
  const { signInWithGoogle } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();

    void (async () => {
      const oauthError = readParam(params.error);
      if (oauthError) {
        setBusy(false);
        setError(readParam(params.error_description) ?? oauthError);
        await clearGoogleOAuthPending();
        return;
      }

      const code = readParam(params.code);
      if (!code) {
        setBusy(false);
        setError('Google giris kodu alinamadi. Tekrar deneyin.');
        return;
      }

      const pending = await loadGoogleOAuthPending();
      if (!pending) {
        setBusy(false);
        setError('Giris oturumu bulunamadi. Profil ekranindan tekrar Google ile giris yap.');
        return;
      }

      try {
        const idToken = await exchangeGoogleAuthCode(code, pending);
        await clearGoogleOAuthPending();
        const claims = parseGoogleIdToken(idToken);
        await signInWithGoogle(claims);
        router.replace('/(tabs)/profil');
      } catch (err) {
        await clearGoogleOAuthPending();
        setBusy(false);
        setError(err instanceof Error ? err.message : 'Google girisi tamamlanamadi.');
      }
    })();
  }, [params.code, params.error, params.error_description, signInWithGoogle]);

  if (busy && !error) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={GastroColors.accent} size="large" />
        <Text style={styles.text}>Google girisi tamamlanıyor…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.errorTitle}>Google girisi tamamlanamadi</Text>
      <Text style={styles.error}>{error ?? 'Bilinmeyen hata'}</Text>
      <Pressable style={styles.btn} onPress={() => router.replace('/(tabs)/profil')}>
        <Text style={styles.btnText}>Profile don</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: GastroColors.bg,
    gap: 12,
    padding: 24,
  },
  text: { color: GastroColors.muted, fontSize: 14, textAlign: 'center' },
  errorTitle: { color: GastroColors.text, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  error: { color: GastroColors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  btn: {
    marginTop: 8,
    backgroundColor: GastroColors.accent,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  btnText: { color: GastroColors.accentDark, fontWeight: '800' },
});
