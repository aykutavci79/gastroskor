const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): boolean {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function resolveRestaurantDetailId(item: {
  id: string;
  restaurant_id?: string | null;
}): string | null {
  if (item.restaurant_id && isUuid(item.restaurant_id)) return item.restaurant_id;
  if (isUuid(item.id)) return item.id;
  return null;
}

export type LiveScoreQuery = {
  gastro_score: number;
  distance_score: number;
  rating_score: number;
  distance_meters: number | null;
  distance_origin: 'user' | 'city_center';
  rating: number | null;
};

function appendLiveScores(href: string, scores: LiveScoreQuery): string {
  const q = new URLSearchParams();
  q.set('gastro', String(scores.gastro_score));
  q.set('ds', String(scores.distance_score));
  q.set('rs', String(scores.rating_score));
  if (scores.distance_meters != null) q.set('dm', String(scores.distance_meters));
  q.set('do', scores.distance_origin);
  if (scores.rating != null) q.set('gr', String(scores.rating));
  return `${href}?${q.toString()}`;
}

/** UUID veya Google place_id ile detay sayfasi rotasi */
export function restaurantDetailHref(item: {
  id: string;
  restaurant_id?: string | null;
  google_place_id?: string | null;
  liveScores?: LiveScoreQuery | null;
}): string | null {
  const uuid = resolveRestaurantDetailId(item);
  let href: string | null = null;
  if (uuid) href = `/restaurant/${uuid}`;
  else {
    const placeFromField = item.google_place_id?.trim();
    const placeFromId = isUuid(item.id) ? '' : item.id.trim();
    const placeId = placeFromField || placeFromId;
    if (placeId) href = `/restaurant/${encodeURIComponent(placeId)}`;
  }
  if (!href || !item.liveScores) return href;
  return appendLiveScores(href, item.liveScores);
}

export function parseLiveScoreParams(
  params: Record<string, string | string[] | undefined>,
): LiveScoreQuery | null {
  const gastro = Number(Array.isArray(params.gastro) ? params.gastro[0] : params.gastro);
  if (!Number.isFinite(gastro)) return null;
  const ds = Number(Array.isArray(params.ds) ? params.ds[0] : params.ds);
  const rs = Number(Array.isArray(params.rs) ? params.rs[0] : params.rs);
  const dmRaw = Array.isArray(params.dm) ? params.dm[0] : params.dm;
  const dm = dmRaw != null && dmRaw !== '' ? Number(dmRaw) : null;
  const doRaw = (Array.isArray(params.do) ? params.do[0] : params.do) as
    | 'user'
    | 'city_center'
    | undefined;
  const grRaw = Array.isArray(params.gr) ? params.gr[0] : params.gr;
  const gr = grRaw != null && grRaw !== '' ? Number(grRaw) : null;
  return {
    gastro_score: gastro,
    distance_score: Number.isFinite(ds) ? ds : 0,
    rating_score: Number.isFinite(rs) ? rs : 0,
    distance_meters: dm != null && Number.isFinite(dm) ? dm : null,
    distance_origin: doRaw === 'user' ? 'user' : 'city_center',
    rating: gr != null && Number.isFinite(gr) ? gr : null,
  };
}
