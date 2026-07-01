import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { GastroColors } from '@/constants/theme';
import { getGoogleSignInSetupHint, isExpoGo, isGoogleSignInConfigured } from '@/lib/google-signin-config';
import { useGoogleSignIn } from '@/hooks/use-google-sign-in';

type Props = {
  busy?: boolean;
  consentAccepted: boolean;
  onError: (message: string) => void;
};

export function GoogleSignInButton({ busy, consentAccepted, onError }: Props) {
  const { t } = useTranslation();
  const setupHint = getGoogleSignInSetupHint();

  if (isExpoGo) {
    return <Text style={styles.warn}>{t('auth.googleExpoWarning')}</Text>;
  }

  if (!isGoogleSignInConfigured()) {
    return <Text style={styles.warn}>{setupHint ?? t('auth.googleNotConfigured')}</Text>;
  }

  return <GoogleSignInNativeButton busy={busy} consentAccepted={consentAccepted} onError={onError} />;
}

function GoogleSignInNativeButton({ busy, consentAccepted, onError }: Props) {
  const { t } = useTranslation();
  const { ready, signIn } = useGoogleSignIn(onError, consentAccepted);
  const [pending, setPending] = useState(false);

  async function onPress() {
    if (!consentAccepted) {
      Alert.alert(t('auth.consentRequiredTitle'), t('auth.consentRequiredForSignIn'));
      return;
    }
    if (busy || pending || !ready) return;
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
        <Text style={styles.googleBtnText}>{t('auth.googleSignIn')}</Text>
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
