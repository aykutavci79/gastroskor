export const KVKK_CONSENT_VERSION = '2026-06-15';

export const KVKK_CONSENT_COOKIE = 'gastro_kvkk_consent';

/** OAuth donusunde backend exchange icin kisa omurlu cookie. */
export function setKvkkConsentCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${KVKK_CONSENT_COOKIE}=1; path=/; max-age=600; SameSite=Lax`;
}

export function clearKvkkConsentCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${KVKK_CONSENT_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
