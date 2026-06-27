import type { Href } from 'expo-router';

export function onlineOrderDetailHref(
  restaurantId: string,
  opts?: {
    distanceMeters?: number | null;
    googleRating?: number | null;
  },
): Href {
  const q = new URLSearchParams();
  if (opts?.distanceMeters != null && Number.isFinite(opts.distanceMeters)) {
    q.set('dm', String(Math.round(opts.distanceMeters)));
  }
  if (opts?.googleRating != null && Number.isFinite(opts.googleRating)) {
    q.set('gr', String(opts.googleRating));
  }
  const qs = q.toString();
  return `/online-siparis/${restaurantId}${qs ? `?${qs}` : ''}` as Href;
}
