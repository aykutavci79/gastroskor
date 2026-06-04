const DEFAULT_PRODUCTION_API = 'https://api.gastroskor.com.tr';

function looksLikeLocalApi(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

export function getApiBase(): string {
  const configured = (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_PRODUCTION_API).replace(/\/$/, '');
  if (looksLikeLocalApi(configured)) {
    return DEFAULT_PRODUCTION_API;
  }
  return configured;
}

export function getApiV1Base(): string {
  return `${getApiBase()}/api/v1`;
}
