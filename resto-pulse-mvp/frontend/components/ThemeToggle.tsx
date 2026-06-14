'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <span
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-input"
        aria-hidden
      />
    );
  }

  const isLight = resolvedTheme === 'light';

  return (
    <button
      type="button"
      onClick={() => setTheme(isLight ? 'dark' : 'light')}
      className="inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-full border border-border bg-surface-input px-2.5 text-sm transition hover:border-brand/50"
      aria-label={isLight ? 'Gece moduna geç' : 'Gündüz moduna geç'}
      title={isLight ? 'Gece modu' : 'Gündüz modu'}>
      <span aria-hidden>{isLight ? '🌙' : '☀️'}</span>
      <span className="hidden text-xs font-semibold text-content-muted sm:inline">
        {isLight ? 'Gece' : 'Gündüz'}
      </span>
    </button>
  );
}
