/** 3 tam karo + 4. kısmi görünüm (Netflix tarzı yatay şerit). */
export function peekTileWidth(
  screenWidth: number,
  opts?: {
    paddingLeft?: number;
    peekRight?: number;
    visibleCount?: number;
    gap?: number;
  },
): number {
  const paddingLeft = opts?.paddingLeft ?? 12;
  const peekRight = opts?.peekRight ?? 36;
  const visibleCount = opts?.visibleCount ?? 3;
  const gap = opts?.gap ?? 8;
  const lane = screenWidth - paddingLeft - peekRight - gap * visibleCount;
  return Math.max(72, Math.floor(lane / visibleCount));
}
