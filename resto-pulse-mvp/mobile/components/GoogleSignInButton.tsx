import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { GastroColors } from '@/constants/theme';
import { getGoogleSignInSetupHint, isExpoGo, isGoogleSignInConfigured } from '@/lib/google-signin-config';
import { useGoogleSignIn } from '@/hooks/use-google-sign-in';

type Props = {
  busy?: boolean;
  onError: (message: string) => void;
};

export function GoogleSignInButton({ busy, onError }: Props) {
  const setupHint = getGoogleSignInSetupHint();

  if (isExpoGo) {
    return (
      <Text style={styles.warn}>
        Google girisi Expo Go&apos;da calismaz. Play dahili test veya EAS build kullanin.
      </Text>
    );
  }

  if (!isGoogleSignInConfigured()) {
    return <Text style={styles.warn}>{setupHint ?? 'Google girisi yapilandirilmamis.'}</Text>;
  }

  return <GoogleSignInNativeButton busy={busy} onError={onError} />;
}

function GoogleSignInNativeButton({ busy, onError }: Props) {
  const { ready, signIn } = useGoogleSignIn(onError);
  const [pending, setPending] = useState(false);

  async function onPress() {
    setPending(true);
    try {
      await signIn();
    } finally {
      setPending(false);
    }
  }

  const disabled = busy || pending || !ready;

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
