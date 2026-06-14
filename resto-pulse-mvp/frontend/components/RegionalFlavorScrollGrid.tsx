'use client';

import Link from 'next/link';
import { useMemo, type CSSProperties } from 'react';

import { RegionalProductImage } from '@/components/RegionalProductImage';
import { trimImageAlt } from '@/lib/seo-title';
import type { RegionalProductItem } from '@/lib/types';

export const REGIONAL_FLAVOR_THUMB_HEIGHT = 88;
const MIN_COL_REM = 5.5;
const GAP_REM = 0.75;

function shortLabel(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return words.length > 1 ? words[words.length - 1]! : name;
}

function gridStyle(colCount: number): CSSProperties {
  return {
    width: '100%',
    minWidth: `max(100%, calc(${colCount} * ${MIN_COL_REM}rem + ${Math.max(0, colCount - 1)} * ${GAP_REM}rem))`,
    gridTemplateColumns: `repeat(${colCount}, minmax(${MIN_COL_REM}rem, 1fr))`,
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
      className="group block min-w-0 w-full">
      <div
        className="relative w-full overflow-hidden rounded-[10px] border border-border/70 bg-surface-input"
        style={{ height: REGIONAL_FLAVOR_THUMB_HEIGHT }}>
        {item.image_url ? (
          <RegionalProductImage
            src={item.image_url}
            alt={trimImageAlt(`${item.name} — yöresel lezzet`)}
            width={180}
            height={REGIONAL_FLAVOR_THUMB_HEIGHT}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 28vw, (max-width: 1024px) 18vw, 12vw"
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
    <div className="w-full overflow-x-hidden">
      <div className="grid grid-flow-col grid-rows-2 gap-x-3 gap-y-3" style={gridStyle(colCount)}>
        {Array.from({ length: itemCount }).map((_, index) => (
          <div key={index} className="min-w-0 w-full space-y-1.5">
            <div
              className="w-full animate-pulse rounded-[10px] bg-surface-input"
              style={{ height: REGIONAL_FLAVOR_THUMB_HEIGHT }}
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
      <div className="grid grid-flow-col grid-rows-2 gap-x-3 gap-y-3" style={gridStyle(colCount)}>
        {items.map((item) => (
          <RegionalFlavorTile key={item.slug} item={item} city={city} />
        ))}
      </div>
    </div>
  );
}
