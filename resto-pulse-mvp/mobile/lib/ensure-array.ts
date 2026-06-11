/** API / JSON alanlarini guvenli dizi yapar (null, obje vb.). */
export function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}
