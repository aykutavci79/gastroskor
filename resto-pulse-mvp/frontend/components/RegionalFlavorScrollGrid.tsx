'use client';

import Link from 'next/link';
import { useMemo, type CSSProperties } from 'react';

import { RegionalProductImage } from '@/components/RegionalProductImage';
import { trimImageAlt } from '@/lib/seo-title';
import type { RegionalProductItem } from '@/lib/types';

/** Sabit karo — il / urun sayisina gore genislemez. */
export const REGIONAL_FLAVOR_TILE_WIDTH_PX = 108;
export const REGIONAL_FLAVOR_THUMB_HEIGHT = 88;
const GRID_GAP_PX = 12;

function shortLabel(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return words.length > 1 ? words[words.length - 1]! : name;
}

function gridStyle(colCount: number): CSSProperties {
  const widthPx = colCount * REGIONAL_FLAVOR_TILE_WIDTH_PX + Math.max(0, colCount - 1) * GRID_GAP_PX;
  return {
    width: `${widthPx}px`,
    minWidth: 'min(100%, max-content)',
    gridTemplateColumns: `repeat(${colCount}, ${REGIONAL_FLAVOR_TILE_WIDTH_PX}px)`,
  };
}

type TileProps = {
  item: RegionalProductItem;
  city: string;
};

export function RegionalFlavorTile({ item, city }: TileProps) {
  return (
    <Link
      href={`/yoresel-lezzetler/${item.slug}?city=${encodeURIComponent(city)}`}
      className="group block shrink-0"
      style={{ width: REGIONAL_FLAVOR_TILE_WIDTH_PX }}>
      <div
        className="relative overflow-hidden rounded-[10px] border border-border/70 bg-surface-input"
        style={{ width: REGIONAL_FLAVOR_TILE_WIDTH_PX, height: REGIONAL_FLAVOR_THUMB_HEIGHT }}>
        {item.image_url ? (
          <RegionalProductImage
            src={item.image_url}
            alt={trimImageAlt(`${item.name} — yöresel lezzet`)}
            width={REGIONAL_FLAVOR_TILE_WIDTH_PX}
            height={REGIONAL_FLAVOR_THUMB_HEIGHT}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            sizes={`${REGIONAL_FLAVOR_TILE_WIDTH_PX}px`}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-[10px] font-medium text-content-muted">
            {shortLabel(item.name)}
          </div>
        )}
      </div>
      <p className="mt-1.5 line-clamp-2 text-[11px] font-bold leading-tight text-content group-hover:text-brand-gold">
        {item.name}
      </p>
    </Link>
  );
}

export function RegionalFlavorScrollSkeleton({ itemCount = 12 }: { itemCount?: number }) {
  const colCount = Math.max(1, Math.ceil(itemCount / 2));

  return (
    <div className="w-full overflow-x-auto pb-1 scroll-smooth [scrollbar-width:thin]">
      <div className="grid grid-flow-col grid-rows-2 gap-3" style={gridStyle(colCount)}>
        {Array.from({ length: itemCount }).map((_, index) => (
          <div key={index} className="shrink-0 space-y-1.5" style={{ width: REGIONAL_FLAVOR_TILE_WIDTH_PX }}>
            <div
              className="animate-pulse rounded-[10px] bg-surface-input"
              style={{ width: REGIONAL_FLAVOR_TILE_WIDTH_PX, height: REGIONAL_FLAVOR_THUMB_HEIGHT }}
            />
            <div className="h-3 w-4/5 animate-pulse rounded bg-surface-input" />
          </div>
        ))}
      </div>
    </div>
  );
}

type GridProps = {
  items: RegionalProductItem[];
  city: string;
  className?: string;
};

export function RegionalFlavorScrollGrid({ items, city, className = '' }: GridProps) {
  const colCount = useMemo(() => Math.max(1, Math.ceil(items.length / 2)), [items.length]);

  return (
    <div className={`w-full overflow-x-auto pb-1 scroll-smooth [scrollbar-width:thin] ${className}`.trim()}>
      <div className="grid grid-flow-col grid-rows-2 gap-3" style={gridStyle(colCount)}>
        {items.map((item) => (
          <RegionalFlavorTile key={item.slug} item={item} city={city} />
        ))}
      </div>
    </div>
  );
}
