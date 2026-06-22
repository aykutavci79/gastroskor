import type { ReactNode } from 'react';
import { Platform } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';

/** Android + new arch: root KeyboardProvider touch/donma yapabiliyor (#687). */
export function KeyboardRoot({ children }: { children: ReactNode }) {
  if (Platform.OS === 'android') {
    return children;
  }
  return <KeyboardProvider>{children}</KeyboardProvider>;
}
