import { PostHogProvider, usePostHog, type PostHogEventProperties } from 'posthog-react-native';
import { createContext, useContext, type ReactNode } from 'react';

export type GastroPostHogClient = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
};

export const noopPostHog: GastroPostHogClient = {
  capture: () => undefined,
};

const GastroPostHogContext = createContext<GastroPostHogClient>(noopPostHog);

export function useGastroPostHog(): GastroPostHogClient {
  return useContext(GastroPostHogContext);
}

function PostHogBridge({ children }: { children: ReactNode }) {
  const posthog = usePostHog();
  const client: GastroPostHogClient = {
    capture: (event, properties) => {
      posthog.capture(event, properties as PostHogEventProperties | undefined);
    },
  };
  return <GastroPostHogContext.Provider value={client}>{children}</GastroPostHogContext.Provider>;
}

type GastroPostHogRootProps = {
  children: ReactNode;
  apiKey?: string;
  host?: string;
};

/** Event analytics — session replay yok (Android new arch crash/donma onlenir). */
export function GastroPostHogRoot({ children, apiKey, host }: GastroPostHogRootProps) {
  if (!apiKey) {
    return <GastroPostHogContext.Provider value={noopPostHog}>{children}</GastroPostHogContext.Provider>;
  }

  return (
    <PostHogProvider apiKey={apiKey} options={{ host }}>
      <PostHogBridge>{children}</PostHogBridge>
    </PostHogProvider>
  );
}
