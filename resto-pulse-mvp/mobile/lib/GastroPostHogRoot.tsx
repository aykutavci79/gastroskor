import type { ReactNode } from 'react';

import { GastroPostHogContext, noopPostHog } from '@/lib/gastro-posthog';

/** Android: posthog-react-native native modulu bundle'a girmez — acilis crash onlenir. */
export function GastroPostHogRoot({
  children,
}: {
  children: ReactNode;
  apiKey?: string;
  host?: string;
}) {
  return <GastroPostHogContext.Provider value={noopPostHog}>{children}</GastroPostHogContext.Provider>;
}
