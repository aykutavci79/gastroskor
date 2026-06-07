import { useEffect } from 'react';

import { isExpoGo } from '@/lib/google-signin-config';
import { configureGoogleSignIn } from '@/lib/google-signin-native';

/** Store build: Google Sign-In SDK configure (Expo Go haric). */
export function GoogleSignInBootstrap() {
  useEffect(() => {
    if (isExpoGo) return;
    configureGoogleSignIn();
  }, []);
  return null;
}
