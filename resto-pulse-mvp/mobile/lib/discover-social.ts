import type { LivePlaceSearchItem } from '@/lib/types';
import type { SocialProofStatus, SocialProofVenueResult } from '@/lib/types';

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_MS = 90_000;

// Rozet gosterim tabani (backend social_proof_min_* ile ayni mantik).
// Cache taze olsa bile guncel Google puani/yorumu bu esiklerin altinaysa rozet gizlenir.
const SOCIAL_DISPLAY_MIN_RATING = 4.0;
const SOCIAL_DISPLAY_MIN_REVIEWS = 1000;

export function socialItemEligible(item: {
  rating?: number | null;
  user_ratings_total?: number | null;
}): boolean {
  if ((item.user_ratings_total ?? 0) < SOCIAL_DISPLAY_MIN_REVIEWS) return false;
  if ((item.rating ?? 0) < SOCIAL_DISPLAY_MIN_RATING) return false;
  return true;
}

const SOCIAL_BADGE_RANK: Record<string, number> = {
  yüksek: 3,
  orta: 2,
  sınırlı: 1,
};

export function socialBadgeRank(badge: string | undefined): number {
  if (!badge) return 0;
  return SOCIAL_BADGE_RANK[badge] ?? 0;
}

export function sortLivePlacesBySocialProof(
  items: LivePlaceSearchItem[],
  index: SocialResultsIndex,
): LivePlaceSearchItem[] {
  return [...items].sort((a, b) => {
    const sa = socialItemEligible(a) ? lookupSocialResult(index, a) : undefined;
    const sb = socialItemEligible(b) ? lookupSocialResult(index, b) : undefined;
    const badgeDiff = socialBadgeRank(sb?.badge) - socialBadgeRank(sa?.badge);
    if (badgeDiff !== 0) return badgeDiff;
    const scoreDiff = (sb?.final_score ?? 0) - (sa?.final_score ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return (b.gastro_score ?? 0) - (a.gastro_score ?? 0);
  });
}

export function socialBadgeLabel(badge: string | undefined): string | null {
  if (!badge) return null;
  if (badge === 'yüksek') return 'Sosyal · yüksek';
  if (badge === 'orta') return 'Sosyal · orta';
  if (badge === 'sınırlı') return 'Sosyal · sınırlı';
  return `Sosyal · ${badge}`;
}

function compactVenueName(name: string): string {
  return name
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '');
}

export type SocialResultsIndex = {
  byPlaceId: Map<string, SocialProofVenueResult>;
  byName: Map<string, SocialProofVenueResult>;
};

export function socialResultsIndex(
  results: SocialProofVenueResult[] | undefined,
): SocialResultsIndex {
  const byPlaceId = new Map<string, SocialProofVenueResult>();
  const byName = new Map<string, SocialProofVenueResult>();
  for (const row of results ?? []) {
    byPlaceId.set(row.place_id, row);
    const key = compactVenueName(row.name ?? '');
    if (key && !byName.has(key)) {
      byName.set(key, row);
    }
  }
  return { byPlaceId, byName };
}

/** @deprecated use socialResultsIndex + lookupSocialResult */
export function socialResultsByPlaceId(
  results: SocialProofVenueResult[] | undefined,
): Map<string, SocialProofVenueResult> {
  return socialResultsIndex(results).byPlaceId;
}

export function lookupSocialResult(
  index: SocialResultsIndex,
  item: { place_id?: string | null; name?: string | null },
): SocialProofVenueResult | undefined {
  if (item.place_id) {
    const byId = index.byPlaceId.get(item.place_id);
    if (byId) return byId;
  }
  const key = compactVenueName(item.name ?? '');
  return key ? index.byName.get(key) : undefined;
}

export async function pollDiscoverSocialJob(
  jobId: string,
  onTick: (social: SocialProofStatus) => void,
  fetchJob: (id: string) => Promise<{ social: SocialProofStatus; status: string }>,
): Promise<SocialProofStatus> {
  const started = Date.now();
  let latest: SocialProofStatus = { status: 'scanning', job_id: jobId, progress_pct: 5, results: [] };

  while (Date.now() - started < MAX_POLL_MS) {
    try {
      const payload = await fetchJob(jobId);
      latest = payload.social;
      onTick(latest);
      if (payload.status === 'ready' || payload.status === 'insufficient_data' || payload.status === 'failed') {
        return latest;
      }
      if (latest.status === 'ready' || latest.status === 'insufficient_data' || latest.status === 'failed') {
        return latest;
      }
    } catch {
      /* sonraki turda tekrar dene */
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  return latest;
}
