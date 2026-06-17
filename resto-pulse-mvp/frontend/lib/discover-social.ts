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

export function socialBadgeLabel(badge: string | undefined): string | null {
  if (!badge) return null;
  if (badge === 'yüksek') return 'Sosyal · yüksek';
  if (badge === 'orta') return 'Sosyal · orta';
  if (badge === 'sınırlı') return 'Sosyal · sınırlı';
  return `Sosyal · ${badge}`;
}

export function socialResultsByPlaceId(
  results: SocialProofVenueResult[] | undefined,
): Map<string, SocialProofVenueResult> {
  const map = new Map<string, SocialProofVenueResult>();
  for (const row of results ?? []) {
    map.set(row.place_id, row);
  }
  return map;
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
