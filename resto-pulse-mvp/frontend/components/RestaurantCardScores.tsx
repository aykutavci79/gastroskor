import {
  resolveCardRatingScore,
  resolveRatingBandVisual,
} from '@/lib/rating-band-visual';

type Props = {
  googleRating?: number | null;
  googleReviewCount?: number | null;
  gastroRating?: number | null;
  compact?: boolean;
  googleLabel?: string;
};

export function RestaurantCardScores({
  googleRating,
  googleReviewCount,
  gastroRating,
  compact = false,
  googleLabel = 'Google',
}: Props) {
  const hasGoogle = googleRating != null;
  const hasGastro = gastroRating != null;
  if (!hasGoogle && !hasGastro) return null;

  const ratingForBand = resolveCardRatingScore({
    gastroRating,
    googleRating,
  });
  const ratingVisual = hasGoogle ? resolveRatingBandVisual(ratingForBand) : null;

  const pillBase = compact
    ? 'rounded-md px-1.5 py-0.5 text-[10px] font-semibold backdrop-blur-sm border'
    : 'rounded-lg px-2 py-1 text-xs font-semibold backdrop-blur-sm border';

  const defaultPill = compact
    ? 'rounded-md bg-surface/90 px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-sm'
    : 'rounded-lg bg-surface/90 px-2 py-1 text-xs font-medium backdrop-blur-sm';

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${compact ? 'mt-1.5' : 'mt-2'}`}>
      {hasGoogle ? (
        ratingVisual ? (
          <span
            className={`${pillBase}`}
            style={{
              color: ratingVisual.accent,
              borderColor: ratingVisual.accent,
              backgroundColor: ratingVisual.softBackground,
            }}>
            <span aria-hidden style={{ color: ratingVisual.accent }}>
              ★{' '}
            </span>
            {googleLabel} {googleRating!.toFixed(1)}
            {googleReviewCount != null && googleReviewCount > 0 ? (
              <span className="font-medium text-content-muted">
                {' '}
                · {googleReviewCount.toLocaleString('tr-TR')}
              </span>
            ) : null}
          </span>
        ) : (
          <span className={`${defaultPill} text-google`}>
            <span aria-hidden className="text-brand-gold">
              ★{' '}
            </span>
            {googleLabel} {googleRating!.toFixed(1)}
            {googleReviewCount != null && googleReviewCount > 0 ? (
              <span className="text-content-muted"> · {googleReviewCount.toLocaleString('tr-TR')}</span>
            ) : null}
          </span>
        )
      ) : null}
      {hasGastro ? (
        <span className={`${defaultPill} text-brand-gold`}>
          <span aria-hidden>★ </span>
          GS {gastroRating!.toFixed(1)}
        </span>
      ) : null}
    </div>
  );
}
