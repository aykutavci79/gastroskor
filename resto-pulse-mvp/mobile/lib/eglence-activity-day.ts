/** Istanbul takvim günü — kelime yarışması dönem anahtarı (backend ile aynı). */
export function eglenceActivityDayKey(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
