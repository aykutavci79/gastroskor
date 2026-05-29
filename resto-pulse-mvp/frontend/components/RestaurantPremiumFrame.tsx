/** Altin cerceve stilleri — uye isletme yazisi yok, sadece cerceve. */

export function premiumBorderClass(isPremium: boolean): string {
  return isPremium
    ? 'ring-2 ring-amber-400/80 border-amber-500/55 shadow-[0_0_28px_-6px_rgba(251,191,36,0.45)]'
    : 'border border-slate-700/70';
}
