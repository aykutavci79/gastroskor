import type { RestaurantMenuItem } from '@/lib/types';

type Props = {
  items: RestaurantMenuItem[];
  totalCount?: number;
  compact?: boolean;
};

export function RestaurantMenuPreview({ items, totalCount, compact = false }: Props) {
  if (!items.length) return null;

  const more = (totalCount ?? items.length) > items.length ? (totalCount ?? 0) - items.length : 0;

  return (
    <ul className={`space-y-1 ${compact ? 'mt-2' : 'mt-3'}`}>
      {items.map((item) => (
        <li key={item.id} className="flex items-baseline justify-between gap-2 text-xs">
          <span className="text-slate-300">{item.name}</span>
          <span className="shrink-0 font-semibold text-amber-200">{item.price_tl.toFixed(0)} TL</span>
        </li>
      ))}
      {more > 0 ? (
        <li className="text-[10px] text-slate-500">+{more} urun daha (detayda)</li>
      ) : null}
    </ul>
  );
}
