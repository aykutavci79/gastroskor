const DEFAULT_PRODUCTION_API = 'https://api.gastroskor.com.tr';

export function getApiBase(): string {
  const configured = (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_PRODUCTION_API).replace(/\/$/, '');
  return configured;
}

export function getApiV1Base(): string {
  return `${getApiBase()}/api/v1`;
}
