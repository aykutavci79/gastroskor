/** Gradient cerceve — ucretli / one cikan isletme. */

export function featuredCardClass(enabled: boolean): string {
  return enabled ? 'featured-card' : 'border border-border';
}

/** @deprecated featuredCardClass kullanin */
export function premiumBorderClass(isPremium: boolean): string {
  return featuredCardClass(isPremium);
}

export function FeaturedCornerBadge({ label }: { label: string }) {
  return <span className="featured-badge">{label}</span>;
}
