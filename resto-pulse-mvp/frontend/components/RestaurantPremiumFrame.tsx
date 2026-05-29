/** Altin cerceve — uye isletme. */

export function premiumBorderClass(isPremium: boolean): string {
  return isPremium
    ? 'ring-2 ring-brand-gold/80 border-brand-gold/55 shadow-card'
    : 'border border-border';
}
