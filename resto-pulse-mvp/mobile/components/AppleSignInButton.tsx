import { useEffect, useState } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

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
  const { ready, signIn } = useAppleSignIn(onError, consentAccepted);
  const [pending, setPending] = useState(false);
  const [visible, setVisible] = useState(Platform.OS === 'ios');

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setVisible(false);
      return;
    }
    void AppleAuthentication.isAvailableAsync()
      .then(setVisible)
      .catch(() => setVisible(false));
  }, []);

  if (isExpoGo || !visible) {
    return null;
  }

  async function onPress() {
    setPending(true);
    try {
      await signIn();
    } finally {
      setPending(false);
    }
  }

  const disabled = busy || pending || !ready || !consentAccepted;

  if (!consentAccepted || !ready) {
    return (
      <Pressable style={[styles.fallbackBtn, styles.btnDisabled]} disabled>
        <Text style={styles.fallbackText}>{t('auth.appleSignIn')}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.wrap}>
      {pending ? (
        <Pressable style={[styles.fallbackBtn, styles.btnDisabled]} disabled>
          <ActivityIndicator color="#141414" />
        </Pressable>
      ) : (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={12}
          style={styles.appleBtn}
          onPress={() => void onPress()}
        />
      )}
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
