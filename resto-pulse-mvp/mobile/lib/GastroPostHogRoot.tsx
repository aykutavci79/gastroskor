import type { ReactNode } from 'react';

/** Varsayilan (Android / web): PostHog native modulu yuklenmez. */
export function GastroPostHogRoot({
  children,
}: {
  children: ReactNode;
  apiKey?: string;
  host?: string;
}) {
  return <>{children}</>;
}
