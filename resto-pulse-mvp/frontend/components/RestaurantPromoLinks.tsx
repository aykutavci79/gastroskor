import { InstagramIcon } from '@/components/icons/InstagramIcon';
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
    ? 'inline-flex items-center gap-1 rounded-full border border-border/80 bg-surface-input px-2 py-0.5 text-[10px] font-medium text-content hover:border-amber-500/50 hover:text-brand-gold'
    : 'inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-input px-3 py-1.5 text-xs text-content hover:border-amber-500/50 hover:text-brand-gold';

  return (
    <div className={`card-btn-group flex flex-wrap gap-1.5 ${compact ? 'mt-1.5' : 'mt-2'}`}>
      {instagram ? (
        <a
          href={instagram}
          target="_blank"
          rel="noopener noreferrer"
          className={`${linkClass} text-[#E4405F]`}
          aria-label={`Instagram: ${instagramLabel(instagram)}`}>
          <InstagramIcon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
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
