import { createContext, useContext } from 'react';

export type GastroPostHogClient = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
};

export const noopPostHog: GastroPostHogClient = {
  capture: () => undefined,
};

export const GastroPostHogContext = createContext<GastroPostHogClient>(noopPostHog);

export function useGastroPostHog(): GastroPostHogClient {
  return useContext(GastroPostHogContext);
}
