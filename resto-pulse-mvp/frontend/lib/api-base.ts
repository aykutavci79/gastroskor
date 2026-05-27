const DEFAULT_PRODUCTION_API = 'https://api.gastroskor.com.tr';

function looksLikeLocalApi(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

/** Canlıda yanlışlıkla gömülmüş localhost API URL'sini engeller (SSR + tarayıcı). */
export function getApiBase(): string {
  const configured = (process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_PRODUCTION_API).replace(/\/$/, '');

  if (process.env.NODE_ENV === 'production' && looksLikeLocalApi(configured)) {
    return DEFAULT_PRODUCTION_API;
  }

  if (typeof window !== 'undefined') {
    const onLocalSite =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!onLocalSite && looksLikeLocalApi(configured)) {
      return DEFAULT_PRODUCTION_API;
    }
  }

  return configured;
}

export function getApiV1Base(): string {
  return `${getApiBase()}/api/v1`;
}
