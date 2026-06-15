import { getApiBase } from '@/lib/api-base';

/** FastAPI / JSON hata govdesinden okunabilir mesaj cikarir. */
export function parseHttpErrorText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    const parsed = JSON.parse(trimmed) as { detail?: unknown; message?: string };
    const detail = parsed.detail;
    if (typeof detail === 'string') return detail;
    if (detail && typeof detail === 'object' && 'message' in detail) {
      const message = (detail as { message?: string }).message;
      if (typeof message === 'string' && message.trim()) return message.trim();
    }
    if (typeof parsed.message === 'string' && parsed.message.trim()) return parsed.message.trim();
  } catch {
    /* plain text */
  }
  return trimmed;
}

export function formatApiError(err: unknown, context?: string): string {
  const base = getApiBase();
  const prefix = context ? `${context}: ` : '';

  if (typeof err === 'string') {
    return `${prefix}${parseHttpErrorText(err) || 'Bilinmeyen hata'}`;
  }

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
  if (raw.includes('REQUEST_DENIED') || raw.includes('This API project is not authorized')) {
    return `${prefix}Google Places reddetti. Cloud Console'da Places API (Legacy) acik mi, faturalandirma aktif mi ve API anahtari Railway sunucusundan cagrilabilir mi?`;
  }
  if (raw.includes('StringDataRightTruncation') || raw.includes('value too long for type character varying')) {
    return `${prefix}Sunucu veritabani guncel degil (photo_reference). Railway'de alembic upgrade head (0043) calistir.`;
  }
  if (raw.includes('Google Places')) {
    return `${prefix}Google Places veya sunucu kayit hatasi. Backend loglarina bak; genelde migration veya API anahtari.`;
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
    return `${prefix}Bu ozellik sunucuda henuz aktif degil. Uygulama guncel; backend guncellemesi bekleniyor.`;
  }
  return `${prefix}${raw}`;
}
