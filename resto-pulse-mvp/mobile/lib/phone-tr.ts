/** Turk cep telefonu — backend normalize_tr_mobile ile uyumlu. */
export function normalizeTrMobileInput(raw: string): string | null {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length >= 12) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length === 10 && digits[0] === '5') {
    return `+90${digits}`;
  }
  return null;
}

export function formatTrMobileDisplay(e164: string): string {
  const digits = e164.replace(/\D/g, '');
  const local = digits.length >= 12 ? digits.slice(-10) : digits;
  if (local.length !== 10) return e164;
  return `0${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8)}`;
}
