'use client';

import Link from 'next/link';

import { HorizontalScrollPeek } from '@/components/HorizontalScrollPeek';
import { RegionalProductImage } from '@/components/RegionalProductImage';
import { trimImageAlt } from '@/lib/seo-title';
import type { RegionalProductItem } from '@/lib/types';

/** Sabit karo (+10%) — ürün sayısına göre boyut değişmez; fazlası yatay kaydırılır. */
export const REGIONAL_FLAVOR_TILE_WIDTH_PX = 167;
export const REGIONAL_FLAVOR_THUMB_HEIGHT = 132;
export const REGIONAL_FLAVOR_TILE_WIDTH_MD = 185;
export const REGIONAL_FLAVOR_THUMB_HEIGHT_MD = 150;

export const REGIONAL_FLAVOR_TILE_WIDTH_SM = 119;
export const REGIONAL_FLAVOR_THUMB_HEIGHT_SM = 97;

const SKELETON_ITEM_COUNT = 12;
const SCROLL_STEP_PX = 388;
const ROW_GAP_PX = 20;
const COL_GAP_PX = 16;

function shortLabel(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return words.length > 1 ? words[words.length - 1]! : name;
}

type TileMetrics = {
  width: number;
  thumbHeight: number;
  widthMd?: number;
  thumbHeightMd?: number;
};

function tileMetrics(large: boolean): TileMetrics {
  if (large) {
    return {
      width: REGIONAL_FLAVOR_TILE_WIDTH_PX,
      thumbHeight: REGIONAL_FLAVOR_THUMB_HEIGHT,
      widthMd: REGIONAL_FLAVOR_TILE_WIDTH_MD,
      thumbHeightMd: REGIONAL_FLAVOR_THUMB_HEIGHT_MD,
    };
  }
  return {
    width: REGIONAL_FLAVOR_TILE_WIDTH_SM,
    thumbHeight: REGIONAL_FLAVOR_THUMB_HEIGHT_SM,
  };
}

type TileProps = {
  item: RegionalProductItem;
  city: string;
  large: boolean;
};

export function RegionalFlavorTile({ item, city, large }: TileProps) {
  const metrics = tileMetrics(large);
  const imageWidth = large ? metrics.widthMd ?? metrics.width : metrics.width;
  const imageHeight = large ? metrics.thumbHeightMd ?? metrics.thumbHeight : metrics.thumbHeight;

  return (
    <Link
      href={`/yoresel-lezzetler/${item.slug}?city=${encodeURIComponent(city)}`}
      className={`group block shrink-0 snap-start ${large ? 'w-[167px] md:w-[185px]' : 'w-[119px]'}`}>
      <div
        className={`relative overflow-hidden rounded-xl border border-border/70 bg-surface-input ${
          large ? 'h-[132px] w-[167px] md:h-[150px] md:w-[185px]' : 'h-[97px] w-[119px]'
        }`}>
        {item.image_url ? (
          <RegionalProductImage
            src={item.image_url}
            alt={trimImageAlt(`${item.name} — yöresel lezzet`)}
            width={imageWidth}
            height={imageHeight}
            className="h-full w-full object-cover transition group-hover:scale-[1.03]"
            sizes={large ? '(max-width: 768px) 167px, 185px' : '119px'}
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
    <div
      className={`shrink-0 snap-start space-y-2 ${large ? 'w-[167px] md:w-[185px]' : 'w-[119px]'}`}>
      <div
        className={`animate-pulse rounded-xl bg-surface-input ${
          large ? 'h-[132px] w-[167px] md:h-[150px] md:w-[185px]' : 'h-[97px] w-[119px]'
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
  const stripMinHeight = large ? 320 : 248;

  return (
    <div className={className} style={{ minHeight: stripMinHeight }}>
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
    <div
      className="flex w-max flex-row"
      style={{ gap: COL_GAP_PX }}>
      {Array.from({ length: columns }).map((_, colIndex) => (
        <div key={colIndex} className="flex shrink-0 flex-col" style={{ gap: ROW_GAP_PX }}>
          {topRow[colIndex] ? <RegionalFlavorTile item={topRow[colIndex]!} city={city} large={large} /> : null}
          {bottomRow[colIndex] ? (
            <RegionalFlavorTile item={bottomRow[colIndex]!} city={city} large={large} />
          ) : null}
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
      <div className="flex w-max flex-row" style={{ gap: COL_GAP_PX }}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <div key={colIndex} className="flex shrink-0 flex-col" style={{ gap: ROW_GAP_PX }}>
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
  /** Ana sayfa + liste sayfası — büyük sabit karo */
  variant?: 'default' | 'home';
};

export function RegionalFlavorScrollGrid({ items, city, className = '', variant = 'home' }: GridProps) {
  const large = variant !== 'default' ? true : false;

  return (
    <RegionalFlavorScrollStrip large={large} className={className}>
      <TwoRowScrollTrack items={items} city={city} large={large} />
    </RegionalFlavorScrollStrip>
  );
}
