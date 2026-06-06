import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { GastroColors } from '@/constants/theme';
import { useSession } from '@/context/session-context';
import { getMobileGoogleReturnUri, getMobileGoogleSiteUrl, signInWithGoogleViaWeb } from '@/lib/google-sign-in-via-web';
import {
  getGoogleSignInSetupHint,
  isExpoGo,
  isGoogleSignInConfigured,
  shouldUseNativeGoogleSignIn,
  useGoogleSignInExpoGo,
  useGoogleSignInNative,
} from '@/hooks/use-google-sign-in';

type Props = {
  busy?: boolean;
  onError: (message: string) => void;
};

export function GoogleSignInButton({ busy, onError }: Props) {
  const setupHint = getGoogleSignInSetupHint();

  if (!isGoogleSignInConfigured()) {
    return <Text style={styles.warn}>{setupHint ?? 'Google girisi yapilandirilmamis.'}</Text>;
  }

  if (isExpoGo) {
    return <GoogleSignInExpoGoButton busy={busy} onError={onError} />;
  }

  if (shouldUseNativeGoogleSignIn()) {
    return <GoogleSignInNativeButton busy={busy} onError={onError} />;
  }

  return <GoogleSignInWebBridgeButton busy={busy} onError={onError} />;
}

function GoogleSignInExpoGoButton({ busy, onError }: Props) {
  const { ready, promptAsync } = useGoogleSignInExpoGo(onError);

  return (
    <Pressable
      style={[styles.googleBtn, (!ready || busy) && styles.btnDisabled]}
      disabled={!ready || busy}
      onPress={() => void promptAsync()}>
      <Text style={styles.googleBtnText}>Google ile giris yap</Text>
    </Pressable>
  );
}

function GoogleSignInWebBridgeButton({ busy, onError }: Props) {
  const { signInWithGoogle } = useSession();
  const [pending, setPending] = useState(false);

  async function onPress() {
    setPending(true);
    if (__DEV__) {
      console.log('[GoogleAuth] web-bridge', getMobileGoogleSiteUrl(), 'return=', getMobileGoogleReturnUri());
    }
    try {
      const claims = await signInWithGoogleViaWeb();
      await signInWithGoogle(claims);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Google girisi basarisiz.');
    } finally {
      setPending(false);
    }
  }

  const disabled = busy || pending;

  return (
    <Pressable style={[styles.googleBtn, disabled && styles.btnDisabled]} disabled={disabled} onPress={() => void onPress()}>
      {pending ? (
        <ActivityIndicator color="#141414" />
      ) : (
        <Text style={styles.googleBtnText}>Google ile giris yap</Text>
      )}
    </Pressable>
  );
}

function GoogleSignInNativeButton({ busy, onError }: Props) {
  const [useWebFallback, setUseWebFallback] = useState(false);
  const { ready, promptAsync } = useGoogleSignInNative(() => {
    setUseWebFallback(true);
  });

  if (useWebFallback) {
    return <GoogleSignInWebBridgeButton busy={busy} onError={onError} />;
  }

  return (
    <Pressable
      style={[styles.googleBtn, (!ready || busy) && styles.btnDisabled]}
      disabled={!ready || busy}
      onPress={() => void promptAsync()}>
      <Text style={styles.googleBtnText}>Google ile giris yap</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  warn: { color: GastroColors.gold, fontSize: 12, lineHeight: 18 },
  googleBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 46,
    justifyContent: 'center',
  },
  googleBtnText: { color: '#141414', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.5 },
});
