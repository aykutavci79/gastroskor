import type { RestaurantMenuItem } from '@/lib/types';

export type CategoryVisualKind =
  | 'pizza'
  | 'kebab'
  | 'burger'
  | 'dessert'
  | 'coffee'
  | 'seafood'
  | 'breakfast'
  | 'general';

export type CategoryVisual = {
  kind: CategoryVisualKind;
  emoji: string;
  label: string;
  /** Tailwind gradient for badge background */
  gradient: string;
};

const RULES: Array<{ kind: CategoryVisualKind; keywords: string[]; emoji: string; label: string; gradient: string }> =
  [
    {
      kind: 'pizza',
      keywords: ['pizza', 'pide', 'lahmacun', 'italyan'],
      emoji: '🍕',
      label: 'Pizza',
      gradient: 'from-red-500/25 to-orange-500/15',
    },
    {
      kind: 'kebab',
      keywords: ['kofte', 'köfte', 'kebap', 'kebab', 'doner', 'döner', 'cig', 'ciğ', 'lahmacun', 'et'],
      emoji: '🥙',
      label: 'Kebap & köfte',
      gradient: 'from-amber-600/25 to-amber-500/10',
    },
    {
      kind: 'burger',
      keywords: ['burger', 'fast food', 'sandvic', 'sandviç'],
      emoji: '🍔',
      label: 'Burger',
      gradient: 'from-yellow-600/25 to-orange-600/10',
    },
    {
      kind: 'dessert',
      keywords: [
        'tatli',
        'tatlı',
        'pasta',
        'kek',
        'dondurma',
        'baklava',
        'kunefe',
        'künefe',
        'waffle',
        'cikolata',
        'çikolata',
        'kurabiye',
      ],
      emoji: '🍰',
      label: 'Tatlı',
      gradient: 'from-pink-500/25 to-rose-500/10',
    },
    {
      kind: 'coffee',
      keywords: ['kahve', 'cafe', 'kafe', 'cay', 'çay', 'pastane'],
      emoji: '☕',
      label: 'Kafe',
      gradient: 'from-amber-800/30 to-amber-700/10',
    },
    {
      kind: 'seafood',
      keywords: ['balik', 'balık', 'deniz', 'midye', 'kalamar', 'sushi'],
      emoji: '🐟',
      label: 'Deniz ürünleri',
      gradient: 'from-cyan-500/25 to-blue-500/10',
    },
    {
      kind: 'breakfast',
      keywords: ['kahvalti', 'kahvaltı', 'borek', 'börek', 'simid', 'simit', 'menemen'],
      emoji: '🍳',
      label: 'Kahvaltı',
      gradient: 'from-yellow-500/20 to-amber-400/10',
    },
  ];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

function scoreRule(text: string, keywords: string[]): number {
  let score = 0;
  for (const kw of keywords) {
    const n = normalize(kw);
    if (text.includes(n)) score += n.length > 4 ? 3 : 2;
  }
  return score;
}

export function resolveCategoryVisual(input: {
  category?: string | null;
  name?: string | null;
  menuItems?: RestaurantMenuItem[];
}): CategoryVisual {
  const menuText = (input.menuItems ?? [])
    .map((m) => `${m.name} ${m.category ?? ''}`)
    .join(' ');
  const haystack = normalize([input.category, input.name, menuText].filter(Boolean).join(' '));

  let best: (typeof RULES)[number] | null = null;
  let bestScore = 0;

  for (const rule of RULES) {
    const s = scoreRule(haystack, rule.keywords);
    if (s > bestScore) {
      bestScore = s;
      best = rule;
    }
  }

  if (best && bestScore >= 2) {
    return {
      kind: best.kind,
      emoji: best.emoji,
      label: best.label,
      gradient: best.gradient,
    };
  }

  const fallbackLabel = (input.category ?? 'Restoran').trim() || 'Restoran';
  return {
    kind: 'general',
    emoji: '🍽️',
    label: fallbackLabel,
    gradient: 'from-slate-600/30 to-slate-700/15',
  };
}
