import { useCallback, useEffect, useState } from 'react';

import {
  isAppleSignInSupported,
  readAppleSignInError,
  signInWithAppleNative,
} from '@/lib/apple-signin-native';
import { verifyAppleMobileAuth } from '@/lib/api';
import { useSession } from '@/context/session-context';

export function useAppleSignIn(onError: (message: string) => void, kvkkConsentAccepted: boolean) {
  const { signInWithAuthProfile } = useSession();
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    void isAppleSignInSupported()
      .then(setAvailable)
      .catch(() => setAvailable(false));
  }, []);

  const signIn = useCallback(async () => {
    if (!kvkkConsentAccepted) {
      return;
    }
    try {
      const { identityToken, fullName } = await signInWithAppleNative();
      const { profile, access_token, refresh_token } = await verifyAppleMobileAuth(
        identityToken,
        kvkkConsentAccepted,
        fullName,
      );
      await signInWithAuthProfile(
        profile,
        {
          authMethod: 'apple',
          appleSub: profile.apple_sub ?? null,
          googleSub: profile.google_sub ?? null,
        },
        access_token,
        refresh_token,
      );
    } catch (err) {
      onError(readAppleSignInError(err));
    }
  }, [kvkkConsentAccepted, onError, signInWithAuthProfile]);

  return { available, signIn };
}
