type Props = {
  googleRating?: number | null;
  googleReviewCount?: number | null;
  gastroRating?: number | null;
  compact?: boolean;
  /** Trend kartinda Google puanini week_avg_rating ile goster */
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

  const pill = compact
    ? 'rounded-md bg-slate-900/90 px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-sm'
    : 'rounded-lg bg-slate-900/90 px-2 py-1 text-xs font-medium backdrop-blur-sm';

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${compact ? 'mt-1.5' : 'mt-2'}`}>
      {hasGoogle ? (
        <span className={`${pill} text-amber-200`}>
          {googleLabel} {googleRating!.toFixed(1)}
          {googleReviewCount != null && googleReviewCount > 0 ? (
            <span className="text-slate-400"> · {googleReviewCount.toLocaleString('tr-TR')}</span>
          ) : null}
        </span>
      ) : null}
      {hasGastro ? (
        <span className={`${pill} text-emerald-300`}>
          GS {gastroRating!.toFixed(1)}
        </span>
      ) : null}
    </div>
  );
}
