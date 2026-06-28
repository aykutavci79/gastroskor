/** Google Ads conversion — basarili web giris/kayit sonrasi ara sayfa. */
export const POST_AUTH_WELCOME_PATH = '/hosgeldiniz';

/**
 * OAuth sonrasi hedef: mobil deep-link ve acik callbackUrl korunur;
 * varsayilan web girisi /hosgeldiniz uzerinden ana sayfaya gider.
 */
export function resolvePostAuthCallbackUrl(options: {
  callbackFromQuery?: string | null;
  isMobileDeepLink?: boolean;
  mobileReturnUrl?: string | null;
}): string {
  const { callbackFromQuery, isMobileDeepLink, mobileReturnUrl } = options;

  if (isMobileDeepLink && mobileReturnUrl) {
    return `/mobil-giris/tamam?return=${encodeURIComponent(mobileReturnUrl)}`;
  }

  if (callbackFromQuery?.startsWith('/')) {
    if (callbackFromQuery === '/') {
      return POST_AUTH_WELCOME_PATH;
    }
    return callbackFromQuery;
  }

  return POST_AUTH_WELCOME_PATH;
}
