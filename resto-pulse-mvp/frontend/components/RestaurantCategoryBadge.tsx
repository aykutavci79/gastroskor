import { resolveCategoryVisual } from '@/lib/restaurant-category-visual';
import type { RestaurantMenuItem } from '@/lib/types';

type Props = {
  category?: string | null;
  name?: string | null;
  menuItems?: RestaurantMenuItem[];
  compact?: boolean;
  /** Dekoratif arka plan ikonu (kart köşesi) */
  watermark?: boolean;
};

export function RestaurantCategoryBadge({
  category,
  name,
  menuItems,
  compact = false,
  watermark = false,
}: Props) {
  const visual = resolveCategoryVisual({ category, name, menuItems });

  if (watermark) {
    return (
      <span
        className="pointer-events-none absolute right-2 top-2 select-none text-3xl opacity-[0.14]"
        aria-hidden>
        {visual.emoji}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-white/10 bg-gradient-to-r font-medium text-slate-100 ${visual.gradient} ${
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      }`}
      title={visual.label}>
      <span aria-hidden>{visual.emoji}</span>
      <span className="max-w-[8rem] truncate">{visual.label}</span>
    </span>
  );
}
