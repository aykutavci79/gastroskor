import { createContext, useContext } from 'react';

export type GastroPostHogClient = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  identify: (distinctId: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
};

export const noopPostHog: GastroPostHogClient = {
  capture: () => undefined,
  identify: () => undefined,
  reset: () => undefined,
};

const GastroPostHogContext = createContext<GastroPostHogClient>(noopPostHog);

export function useGastroPostHog(): GastroPostHogClient {
  return useContext(GastroPostHogContext);
}

export { GastroPostHogContext };
