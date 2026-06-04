/** Takip API hatalarini kullaniciya anlasilir metne cevirir. */
export function followApiErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : 'İşlem başarısız';
  if (raw.includes('404') || raw.toLowerCase().includes('not found')) {
    return 'Takip servisi sunucuda henüz aktif değil. Backend deploy + migration (0021) gerekli.';
  }
  if (raw.toLowerCase().includes('failed to fetch') || raw.toLowerCase().includes('network')) {
    return 'Ağ hatası — internet veya API adresini kontrol et.';
  }
  if (raw.length > 120) return 'Takip kaydedilemedi. Lütfen tekrar dene.';
  return raw;
}
