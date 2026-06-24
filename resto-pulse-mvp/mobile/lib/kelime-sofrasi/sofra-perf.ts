/** Dev-only Sofra performans logları — Metro'da [perf] ile filtrele. */

export function sofraPerfMark(label: string): number {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return 0;
  console.log(`[perf] ${label} · başladı`);
  return Date.now();
}

export function sofraPerfDone(label: string, t0: number, extra?: string): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__ || !t0) return;
  const suffix = extra ? ` (${extra})` : '';
  console.log(`[perf] ${label} · ${Date.now() - t0}ms${suffix}`);
}
