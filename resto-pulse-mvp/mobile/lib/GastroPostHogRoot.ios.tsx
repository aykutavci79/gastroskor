import { PostHogProvider, usePostHog, type PostHogEventProperties } from 'posthog-react-native';
import type { ReactNode } from 'react';

import {
  GastroPostHogContext,
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

type Props = {
  children: ReactNode;
  apiKey?: string;
  host?: string;
};

export function GastroPostHogRoot({ children, apiKey, host }: Props) {
  if (!apiKey) {
    return <>{children}</>;
  }

  return (
    <PostHogProvider
      apiKey={apiKey}
      options={{
        host,
        enableSessionReplay: true,
      }}>
      <PostHogBridge>{children}</PostHogBridge>
    </PostHogProvider>
  );
}
