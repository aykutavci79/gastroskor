import { useTranslation } from 'react-i18next';

import { categoryLabel } from '@/constants/online-order-categories';

type CommonBundle = {
  categories?: Record<string, string>;
};

/**
 * Returns a function that resolves a translated display label for an
 * online-order category slug.
 *
 * Falls back to the raw TR label from ONLINE_ORDER_CATEGORIES when the
 * current locale bundle doesn't have the slug (e.g. languages whose JSON
 * hasn't been added yet).
 */
export function useCategoryLabel(): (slug: string) => string {
  const { i18n } = useTranslation();

  return (slug: string): string => {
    const bundle = i18n.getResourceBundle(i18n.language, 'common') as
      | CommonBundle
      | undefined;
    return bundle?.categories?.[slug] ?? categoryLabel(slug);
  };
}
