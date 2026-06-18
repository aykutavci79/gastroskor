export function sureMetni(ms: number): string {
  const toplamSn = Math.max(0, Math.floor(ms / 1000));
  const dk = Math.floor(toplamSn / 60);
  const sn = toplamSn % 60;
  return `${dk}:${sn.toString().padStart(2, '0')}`;
}
