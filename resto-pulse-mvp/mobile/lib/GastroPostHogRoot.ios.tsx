import { PostHogProvider, usePostHog, type PostHogEventProperties } from 'posthog-react-native';
import type { ReactNode } from 'react';

import {
  GastroPostHogContext,
  noopPostHog,
  type GastroPostHogClient,
} from '@/lib/gastro-posthog';

function PostHogBridge({ children }: { children: ReactNode }) {
  const posthog = usePostHog();
  const client: GastroPostHogClient = {
    capture: (event, properties) => {
      posthog.capture(event, properties as PostHogEventProperties | undefined);
    },
  };
  return <GastroPostHogContext.Provider value={client}>{children}</GastroPostHogContext.Provider>;
}

export function GastroPostHogRoot({
  children,
  apiKey,
  host,
}: {
  children: ReactNode;
  apiKey?: string;
  host?: string;
}) {
  if (!apiKey) {
    return <GastroPostHogContext.Provider value={noopPostHog}>{children}</GastroPostHogContext.Provider>;
  }

  return (
    <PostHogProvider apiKey={apiKey} options={{ host }}>
      <PostHogBridge>{children}</PostHogBridge>
    </PostHogProvider>
  );
}
