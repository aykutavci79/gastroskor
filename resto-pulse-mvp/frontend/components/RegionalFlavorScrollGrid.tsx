'use client';

import Link from 'next/link';

import { HorizontalScrollPeek } from '@/components/HorizontalScrollPeek';
import { RegionalProductImage } from '@/components/RegionalProductImage';
import { trimImageAlt } from '@/lib/seo-title';
import type { RegionalProductItem } from '@/lib/types';

/** Sabit karo — ürün sayısına göre boyut değişmez; fazlası yatay kaydırılır. */
export const REGIONAL_FLAVOR_TILE_WIDTH_PX = 152;
export const REGIONAL_FLAVOR_THUMB_HEIGHT = 120;
export const REGIONAL_FLAVOR_TILE_WIDTH_MD = 168;
export const REGIONAL_FLAVOR_THUMB_HEIGHT_MD = 136;

const SKELETON_ITEM_COUNT = 12;
const SCROLL_STEP_PX = 352;

function shortLabel(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return words.length > 1 ? words[words.length - 1]! : name;
}

type TileProps = {
  item: RegionalProductItem;
  city: string;
  size?: 'default' | 'large';
};

export function RegionalFlavorTile({ item, city, size = 'default' }: TileProps) {
  const large = size === 'large';

  return (
    <Link
      href={`/yoresel-lezzetler/${item.slug}?city=${encodeURIComponent(city)}`}
      className={`group block shrink-0 snap-start ${large ? 'w-[152px] md:w-[168px]' : 'w-[108px]'}`}>
      <div
        className={`relative overflow-hidden rounded-xl border border-border/70 bg-surface-input ${
          large ? 'h-[120px] w-[152px] md:h-[136px] md:w-[168px]' : 'h-[88px] w-[108px]'
        }`}>
        {item.image_url ? (
          <RegionalProductImage
            src={item.image_url}
            alt={trimImageAlt(`${item.name} — yöresel lezzet`)}
            width={large ? REGIONAL_FLAVOR_TILE_WIDTH_MD : 108}
            height={large ? REGIONAL_FLAVOR_THUMB_HEIGHT_MD : 88}
            className="h-full w-full object-cover transition group-hover:scale-[1.03]"
            sizes={large ? '(max-width: 768px) 152px, 168px' : '108px'}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-[10px] font-medium text-content-muted">
            {shortLabel(item.name)}
          </div>
        )}
      </div>
      <p
        className={`mt-2 line-clamp-2 font-bold leading-tight text-content group-hover:text-brand-gold ${
          large ? 'min-h-[2.5rem] text-[13px] md:text-sm' : 'text-[11px]'
        }`}>
        {item.name}
      </p>
    </Link>
  );
}

function SkeletonTile({ large }: { large: boolean }) {
  return (
    <div className={`shrink-0 snap-start space-y-2 ${large ? 'w-[152px] md:w-[168px]' : 'w-[108px]'}`}>
      <div
        className={`animate-pulse rounded-xl bg-surface-input ${
          large ? 'h-[120px] w-[152px] md:h-[136px] md:w-[168px]' : 'h-[88px] w-[108px]'
        }`}
      />
      <div className="h-4 w-4/5 animate-pulse rounded bg-surface-input" />
      <div className="h-3 w-3/5 animate-pulse rounded bg-surface-input" />
    </div>
  );
}

type ScrollStripProps = {
  children: React.ReactNode;
  large?: boolean;
  className?: string;
};

function RegionalFlavorScrollStrip({ children, large = false, className = '' }: ScrollStripProps) {
  return (
    <div className={`${large ? 'min-h-[292px] md:min-h-[324px]' : ''} ${className}`.trim()}>
      <HorizontalScrollPeek edgeBleed scrollStep={SCROLL_STEP_PX}>
        {children}
      </HorizontalScrollPeek>
    </div>
  );
}

/** İki sıra — Netflix tarzı yatay şerit; sütun sayısı ürün adedine göre uzar, karo boyutu sabit. */
function TwoRowScrollTrack({
  items,
  city,
  large,
}: {
  items: RegionalProductItem[];
  city: string;
  large: boolean;
}) {
  const topRow = items.filter((_, index) => index % 2 === 0);
  const bottomRow = items.filter((_, index) => index % 2 === 1);
  const columns = Math.max(topRow.length, bottomRow.length);

  return (
    <div className="grid w-max grid-flow-col auto-cols-max grid-rows-2 gap-x-4 gap-y-5">
      {Array.from({ length: columns }).map((_, colIndex) => (
        <div key={colIndex} className="flex flex-col gap-5">
          {topRow[colIndex] ? <RegionalFlavorTile item={topRow[colIndex]!} city={city} size={large ? 'large' : 'default'} /> : null}
          {bottomRow[colIndex] ? <RegionalFlavorTile item={bottomRow[colIndex]!} city={city} size={large ? 'large' : 'default'} /> : null}
        </div>
      ))}
    </div>
  );
}

export function RegionalFlavorScrollSkeleton({
  itemCount = SKELETON_ITEM_COUNT,
  large = false,
}: {
  itemCount?: number;
  large?: boolean;
}) {
  const columns = Math.ceil(itemCount / 2);

  return (
    <RegionalFlavorScrollStrip large={large}>
      <div className="grid w-max grid-flow-col auto-cols-max grid-rows-2 gap-x-4 gap-y-5">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-5">
            <SkeletonTile large={large} />
            {colIndex * 2 + 1 < itemCount ? <SkeletonTile large={large} /> : null}
          </div>
        ))}
      </div>
    </RegionalFlavorScrollStrip>
  );
}

type GridProps = {
  items: RegionalProductItem[];
  city: string;
  className?: string;
  /** Ana sayfa vitrin — daha büyük karo + tam genişlik kaydırma */
  variant?: 'default' | 'home';
};

export function RegionalFlavorScrollGrid({ items, city, className = '', variant = 'default' }: GridProps) {
  const large = variant === 'home';

  return (
    <RegionalFlavorScrollStrip large={large} className={className}>
      <TwoRowScrollTrack items={items} city={city} large={large} />
    </RegionalFlavorScrollStrip>
  );
}
