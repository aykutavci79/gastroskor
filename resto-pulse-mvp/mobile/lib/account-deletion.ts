/** Backend ile ayni onay metni — tam eslesme gerekir. */
export const ACCOUNT_DELETION_CONFIRMATION = 'EVET SİL';

export function normalizeDeletionConfirmation(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function isAccountDeletionConfirmed(value: string): boolean {
  const normalized = normalizeDeletionConfirmation(value);
  if (normalized === ACCOUNT_DELETION_CONFIRMATION) return true;
  return normalized.toUpperCase() === 'EVET SIL';
}

export function accountDeletionErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Hesap silinemedi. Lutfen tekrar deneyin.';
}
