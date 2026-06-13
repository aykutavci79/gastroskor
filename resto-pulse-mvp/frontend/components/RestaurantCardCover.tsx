import { RestaurantCardCoverArt } from '@/components/RestaurantCardCoverArt';
import { optimizeCardCoverUrl } from '@/lib/card-cover';
import { restaurantImageAlt } from '@/lib/seo-title';
import { resolveCategoryVisual } from '@/lib/restaurant-category-visual';
import type { RestaurantMenuItem } from '@/lib/types';

type Props = {
  imageUrl?: string | null;
  category?: string | null;
  name?: string | null;
  menuItems?: RestaurantMenuItem[];
  ownerEmoji?: string | null;
  compact?: boolean;
  priorityImage?: boolean;
};

/** Sag tarafta tam yukseklik gorsel; sola dogru panel rengine kaybolur. */
export function RestaurantCardCover({
  imageUrl,
  category,
  name,
  menuItems,
  ownerEmoji,
  compact = false,
  priorityImage = false,
}: Props) {
  const visual = resolveCategoryVisual({ category, name, menuItems, ownerEmoji });
  const displayWidth = compact ? 200 : 280;
  const displayHeight = compact ? 152 : 176;
  const src = optimizeCardCoverUrl(imageUrl, displayWidth);
  const widthClass = compact ? 'w-[46%] min-w-[5.5rem]' : 'w-[44%] min-w-[7rem]';

  return (
    <div
      className={`pointer-events-none absolute inset-y-0 right-0 ${widthClass}`}
      aria-hidden>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={restaurantImageAlt(name, 'restoran görseli')}
          width={displayWidth}
          height={displayHeight}
          className="h-full w-full object-cover"
          loading={priorityImage ? 'eager' : 'lazy'}
          fetchPriority={priorityImage ? 'high' : undefined}
          decoding="async"
        />
      ) : (
        <RestaurantCardCoverArt visual={visual} seed={name ?? category ?? ''} compact={compact} />
      )}
      <div
        className="absolute inset-0 bg-gradient-to-r from-surface-card from-30% via-surface-card/75 via-55% to-transparent"
        aria-hidden
      />
    </div>
  );
}
