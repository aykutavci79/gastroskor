/** Türkçe göreli zaman etiketi (FoodCast vb.) */
export function formatRelativeTimeTr(iso: string, nowMs: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diffSec = Math.max(0, Math.floor((nowMs - then) / 1000));
  if (diffSec < 60) return `${Math.max(1, diffSec)} sn`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} dk`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} sa`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} g`;
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}
