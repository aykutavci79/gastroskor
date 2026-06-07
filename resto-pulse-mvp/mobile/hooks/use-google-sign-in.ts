import { useCallback, useEffect, useState } from 'react';

import { isExpoGo } from '@/lib/google-signin-config';
import { configureGoogleSignIn, readGoogleSignInError, signInWithGoogleNative } from '@/lib/google-signin-native';
import { verifyGoogleMobileAuth } from '@/lib/api';
import { useSession } from '@/context/session-context';

export function useGoogleSignIn(onError: (message: string) => void) {
  const { signInWithGoogleProfile } = useSession();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isExpoGo) {
      setReady(false);
      return;
    }
    configureGoogleSignIn();
    setReady(true);
  }, []);

  const signIn = useCallback(async () => {
    try {
      const idToken = await signInWithGoogleNative();
      const { profile } = await verifyGoogleMobileAuth(idToken);
      await signInWithGoogleProfile(profile);
    } catch (err) {
      onError(readGoogleSignInError(err));
    }
  }, [onError, signInWithGoogleProfile]);

  return { ready, signIn };
}
