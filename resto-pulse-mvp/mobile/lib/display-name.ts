export type AuthorNameDisplayMode = 'full' | 'masked';

export function maskPersonName(name: string | null | undefined): string {
  if (!name?.trim()) return 'GastroSkor Üyesi';
  const parts = name.trim().split(/\s+/);
  return parts
    .map((part) => {
      if (part.length >= 2) return `${part.slice(0, 2).toLowerCase()}***`;
      if (part.length === 1) return `${part[0].toLowerCase()}***`;
      return '';
    })
    .filter(Boolean)
    .join(' ');
}

export function previewAuthorName(
  fullName: string | null | undefined,
  mode: AuthorNameDisplayMode,
): string {
  if (!fullName?.trim()) return 'GastroSkor Üyesi';
  if (mode === 'masked') return maskPersonName(fullName);
  return fullName.trim();
}

export const REVIEW_NAME_DISPLAY_STORAGE_KEY = 'gastroskor.reviewNameDisplay.v1';
