export function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.replace(',', '.').trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function formatNumber(value: unknown, decimals = 1): string | null {
  const n = coerceNumber(value);
  if (n == null) return null;
  return n.toFixed(decimals);
}
