import type { ReactNode } from 'react';

/** Android + new arch: root KeyboardProvider touch/donma yapabiliyor (#687). */
export function KeyboardRoot({ children }: { children: ReactNode }) {
  return children;
}
