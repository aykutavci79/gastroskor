import type { RestaurantPromoPublic } from '@/lib/types';

type Props = {
  promo: RestaurantPromoPublic | null | undefined;
  compact?: boolean;
};

function instagramLabel(url: string): string {
  const match = url.match(/instagram\.com\/([^/?#]+)/i);
  return match ? `@${match[1]}` : 'Instagram';
}

export function RestaurantPromoLinks({ promo, compact = false }: Props) {
  if (!promo) return null;

  const instagram = promo.instagram_url?.trim();
  const website = promo.direct_order_url?.trim();

  if (!instagram && !website) return null;

  const linkClass = compact
    ? 'inline-flex items-center gap-1 rounded-full border border-slate-600/80 bg-slate-800/60 px-2 py-0.5 text-[10px] font-medium text-slate-200 hover:border-amber-500/50 hover:text-amber-100'
    : 'inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-200 hover:border-amber-500/50 hover:text-amber-100';

  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? 'mt-1.5' : 'mt-2'}`}>
      {instagram ? (
        <a href={instagram} target="_blank" rel="noopener noreferrer" className={linkClass}>
          <span aria-hidden>📷</span>
          {compact ? 'IG' : instagramLabel(instagram)}
        </a>
      ) : null}
      {website ? (
        <a href={website} target="_blank" rel="noopener noreferrer" className={linkClass}>
          <span aria-hidden>🌐</span>
          {compact ? 'Web' : 'Web sitesi'}
        </a>
      ) : null}
    </div>
  );
}
