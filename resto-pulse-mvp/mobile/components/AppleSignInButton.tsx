import { useState } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppleSignIn } from '@/hooks/use-apple-sign-in';
import { isExpoGo } from '@/lib/google-signin-config';

type Props = {
  busy?: boolean;
  consentAccepted: boolean;
  onError: (message: string) => void;
};

export function AppleSignInButton({ busy, consentAccepted, onError }: Props) {
  const { t } = useTranslation();
  const { available, signIn } = useAppleSignIn(onError, consentAccepted);
  const [pending, setPending] = useState(false);

  if (Platform.OS !== 'ios' || isExpoGo) {
    return null;
  }

  function promptConsentRequired() {
    Alert.alert(t('auth.consentRequiredTitle'), t('auth.consentRequiredForSignIn'));
  }

  async function onPress() {
    if (!consentAccepted) {
      promptConsentRequired();
      return;
    }
    if (busy || pending) return;
    setPending(true);
    try {
      await signIn();
    } finally {
      setPending(false);
    }
  }

  if (!available) {
    return (
      <Pressable style={styles.fallbackBtn} onPress={() => void onPress()} accessibilityRole="button">
        <Text style={styles.fallbackText}>{t('auth.appleSignIn')}</Text>
      </Pressable>
    );
  }

  if (pending) {
    return (
      <Pressable style={[styles.fallbackBtn, styles.btnDisabled]} disabled>
        <ActivityIndicator color="#141414" />
      </Pressable>
    );
  }

  return (
    <View style={styles.wrap}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={12}
        style={styles.appleBtn}
        onPress={() => void onPress()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  appleBtn: { width: '100%', height: 46 },
  fallbackBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 46,
    justifyContent: 'center',
  },
  fallbackText: { color: '#141414', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.5 },
});
