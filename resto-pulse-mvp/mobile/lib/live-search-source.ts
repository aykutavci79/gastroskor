/** Canli arama kaynagi — API filters_applied.source */

export type LiveSearchSource =
  | 'cache'
  | 'catalog'
  | 'db_only'
  | 'query_log'
  | 'db_and_google'
  | 'unknown';

const SOURCE_LABELS: Record<string, string> = {
  cache: 'Dosya cache',
  catalog: 'DB katalog',
  db_only: 'Kayitli restoran',
  query_log: 'Sorgu log',
  db_and_google: 'Google API',
  unknown: 'Bilinmiyor',
};

export function liveSearchSourceKey(
  filters: Record<string, string | number | null> | undefined,
): LiveSearchSource | null {
  const raw = filters?.source;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  return raw as LiveSearchSource;
}

export function liveSearchGoogleCalled(source: LiveSearchSource | null): boolean {
  return source === 'db_and_google';
}

export function liveSearchSourceLabel(source: LiveSearchSource | string | null): string {
  if (!source) return '—';
  return SOURCE_LABELS[source] ?? source;
}

export function liveSearchSourceHint(source: LiveSearchSource | string | null): string {
  if (liveSearchGoogleCalled(source as LiveSearchSource | null)) {
    return 'Google Places API cagrildi';
  }
  if (!source) return '';
  if (source === 'cache') return 'Sunucu dosya onbellegi (24 saat)';
  if (source === 'query_log') return 'Bu sorgu icin Google son 7 gunde zaten cagrildi';
  return 'Google cagrilmadi — DB / katalog';
}

export function liveSearchAnalyticsProps(
  filters: Record<string, string | number | null> | undefined,
  extras: { query: string; result_count: number; city: string },
) {
  const search_source = liveSearchSourceKey(filters);
  return {
    ...extras,
    search_source: search_source ?? 'unknown',
    google_called: liveSearchGoogleCalled(search_source),
  };
}
