import { getApiBase } from '@/lib/api-base';

export function formatApiError(err: unknown, context?: string): string {
  const base = getApiBase();
  const prefix = context ? `${context}: ` : '';

  if (err instanceof TypeError && /network request failed/i.test(err.message)) {
    if (/127\.0\.0\.1|localhost/i.test(base)) {
      return (
        `${prefix}API'ye ulasilamadi (${base}). ` +
        'Telefonda localhost calismaz; .env icinde EXPO_PUBLIC_API_URL=https://api.gastroskor.com.tr yap veya bilgisayarinin LAN IP adresini yaz (ornek http://192.168.1.5:8000).'
      );
    }
    return `${prefix}Internet veya API baglantisi kurulamadi (${base}).`;
  }

  const raw = err instanceof Error ? err.message : 'Bilinmeyen hata';
  if (/abortsignaltimeout|abort.*timeout/i.test(raw)) {
    return `${prefix}Istek zaman asimi (uygulama guncellemesi gerekli olabilir). Uygulamayi yeniden yukle (Expo Go: r).`;
  }
  if (err instanceof Error && err.name === 'AbortError') {
    return `${prefix}Istek zaman asimina ugradi (${base}).`;
  }
  if (raw.includes('GOOGLE_PLACES_API_KEY')) {
    return `${prefix}Sunucuda Google Places anahtari eksik. Railway/backend .env icinde GOOGLE_PLACES_API_KEY tanimla.`;
  }
  if (raw.includes('REQUEST_DENIED') || raw.includes('Google Places')) {
    return `${prefix}Google Places reddetti. Cloud Console'da Places API acik mi ve API anahtari sunucu (IP/kisitsiz) icin mi?`;
  }
  if (/^5\d{2}:/.test(raw) || raw.includes('Internal Server')) {
    return `${prefix}Sunucu hatasi (${base}). Backend loglarina bak; migration eksik olabilir.`;
  }
  if (/not found/i.test(raw) && /gourmet|avatar|nickname/i.test(raw + (context ?? ''))) {
    if (/gourmet-chat|gurme sohbet/i.test(raw + (context ?? ''))) {
      return (
        `${prefix}Gurme Sohbetler API henuz canli sunucuda yok. ` +
        'Backend deploy + Railway\'de alembic upgrade head (0025) gerekli.'
      );
    }
    return (
      `${prefix}Gurme profil API henuz canli sunucuda yok. ` +
      'Railway\'de backend deploy edilmeli (E1 kodu + alembic 0024).'
    );
  }
  if (raw === 'Not Found' || raw.includes('"detail":"Not Found"') || /^404:/.test(raw)) {
    return (
      `${prefix}API ucu bulunamadi (${base}). Backend guncel deploy edildi mi kontrol et.`
    );
  }
  return `${prefix}${raw}`;
}
