import type { ReactNode } from 'react';

type Props = {
  isPremium: boolean;
  children: ReactNode;
  className?: string;
  as?: 'div' | 'article';
};

export function premiumBorderClass(isPremium: boolean): string {
  return isPremium
    ? 'ring-2 ring-amber-400/80 border-amber-500/55 shadow-[0_0_28px_-6px_rgba(251,191,36,0.45)]'
    : 'border-slate-700/70';
}

export function RestaurantPremiumFrame({ isPremium, children, className = '', as = 'div' }: Props) {
  const Tag = as;
  return (
    <Tag
      className={`relative ${premiumBorderClass(isPremium)} ${className}`}>
      {isPremium ? (
        <span className="absolute -top-2.5 left-3 rounded-md bg-gradient-to-r from-amber-500 to-amber-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950 shadow">
          Uye isletme
        </span>
      ) : null}
      {children}
    </Tag>
  );
}
