'use client';

type Props = {
  restaurantId: string;
  className?: string;
};

/** Web fallback: uygulama yuklu ama in-app tarayici Universal Link acmiyorsa. */
export function OpenInAppLink({ restaurantId, className }: Props) {
  const appUrl = `gastroskor://restaurant/${encodeURIComponent(restaurantId)}`;

  return (
    <a
      href={appUrl}
      className={
        className ??
        'inline-flex items-center gap-1 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-sm font-semibold text-accent hover:bg-accent/15'
      }>
      Uygulamada aç
    </a>
  );
}
