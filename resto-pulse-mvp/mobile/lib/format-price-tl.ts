/** API / STT kaynakli fiyatlari guvenli sayiya cevirir. */

export function coercePriceTl(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.replace(',', '.').trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function formatPriceTl(value: unknown, decimals = 0): string | null {
  const n = coercePriceTl(value);
  if (n == null) return null;
  return n.toFixed(decimals);
}
